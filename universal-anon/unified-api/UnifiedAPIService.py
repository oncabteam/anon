"""
OnCabaret Anonymous Intent SDK - Unified API Service
Orchestrates all ML services to provide seamless integration with just an API key
"""

import json
import boto3
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
import asyncio
import concurrent.futures
import hashlib
import uuid
from enum import Enum

# Import our ML services
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'ml-pipeline'))

from feature_engineering.FeatureEngineeringService import FeatureEngineeringService
from clustering.ClusteringService import ClusteringService
from intent_scoring.IntentScoringService import IntentScoringService

logger = logging.getLogger(__name__)

class APIKeyStatus(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    TRIAL = "trial"

@dataclass
class APIKeyInfo:
    api_key: str
    customer_id: str
    status: APIKeyStatus
    plan_type: str
    created_at: str
    rate_limit: int
    features_enabled: List[str]
    metadata: Dict[str, Any]

@dataclass
class EventProcessingResult:
    success: bool
    anon_id: str
    session_id: str
    features_extracted: Dict[str, Any]
    cluster_assignment: Dict[str, Any]
    intent_scores: Dict[str, Any]
    real_time_metrics: Dict[str, Any]
    processing_time_ms: float
    error: Optional[str] = None

class UnifiedAPIService:
    """
    Unified API service that makes everything work with just an API key
    Orchestrates feature engineering, clustering, and intent scoring
    """
    
    def __init__(self, 
                 environment: str = 'production',
                 aws_region: str = 'us-east-1'):
        self.environment = environment
        self.aws_region = aws_region
        
        # Initialize AWS clients
        self.dynamodb = boto3.resource('dynamodb', region_name=aws_region)
        self.lambda_client = boto3.client('lambda', region_name=aws_region)
        self.kinesis_client = boto3.client('kinesis', region_name=aws_region)
        self.s3_client = boto3.client('s3', region_name=aws_region)
        
        # Initialize table references
        self.api_keys_table = self.dynamodb.Table(f'anon-intent-sdk-api-keys-{environment}')
        self.events_table = self.dynamodb.Table(f'anon-intent-sdk-events-{environment}')
        self.sessions_table = self.dynamodb.Table(f'anon-intent-sdk-sessions-{environment}')
        self.metrics_table = self.dynamodb.Table(f'anon-intent-sdk-metrics-{environment}')
        self.feature_store_table = self.dynamodb.Table(f'anon-intent-sdk-feature-store-{environment}')
        self.clusters_table = self.dynamodb.Table(f'anon-intent-sdk-intent-clusters-{environment}')
        
        # Initialize ML services
        self.feature_service = FeatureEngineeringService(
            events_table_name=f'anon-intent-sdk-events-{environment}',
            sessions_table_name=f'anon-intent-sdk-sessions-{environment}',
            feature_store_table_name=f'anon-intent-sdk-feature-store-{environment}'
        )
        
        self.clustering_service = ClusteringService(
            feature_store_table_name=f'anon-intent-sdk-feature-store-{environment}',
            clusters_table_name=f'anon-intent-sdk-intent-clusters-{environment}',
            s3_bucket_name=f'anon-intent-sdk-ml-models-{environment}'
        )
        
        self.intent_service = IntentScoringService(
            feature_store_table_name=f'anon-intent-sdk-feature-store-{environment}',
            events_table_name=f'anon-intent-sdk-events-{environment}',
            sessions_table_name=f'anon-intent-sdk-sessions-{environment}',
            s3_bucket_name=f'anon-intent-sdk-ml-models-{environment}'
        )
        
        # Configuration
        self.kinesis_stream_name = f'anon-intent-sdk-events-{environment}'
        self.cache_function_name = f'anon-intent-sdk-redis-cache-manager-{environment}'
        
        # Auto-provisioning configuration
        self.auto_provision_enabled = True
        self.trial_period_days = 14
        self.default_rate_limit = 10000  # events per hour
        
    async def process_event(self, api_key: str, event_data: Dict) -> EventProcessingResult:
        """
        Main entry point: Process a single event with full ML pipeline
        This is what customers call - everything else happens automatically
        
        Args:
            api_key: Customer API key
            event_data: Event data from SDK
            
        Returns:
            Complete processing result with insights
        """
        start_time = datetime.utcnow()
        
        try:
            # 1. Validate API key (with caching)
            api_key_info = await self._validate_api_key_async(api_key)
            if not api_key_info or api_key_info.status not in [APIKeyStatus.ACTIVE, APIKeyStatus.TRIAL]:
                return EventProcessingResult(
                    success=False,
                    anon_id=event_data.get('anonId', 'unknown'),
                    session_id=event_data.get('sessionId', 'unknown'),
                    features_extracted={},
                    cluster_assignment={},
                    intent_scores={},
                    real_time_metrics={},
                    processing_time_ms=0,
                    error='Invalid or inactive API key'
                )
            
            # 2. Rate limiting check
            if not await self._check_rate_limit(api_key, api_key_info.rate_limit):
                return EventProcessingResult(
                    success=False,
                    anon_id=event_data.get('anonId', 'unknown'),
                    session_id=event_data.get('sessionId', 'unknown'),
                    features_extracted={},
                    cluster_assignment={},
                    intent_scores={},
                    real_time_metrics={},
                    processing_time_ms=0,
                    error='Rate limit exceeded'
                )
            
            # 3. Auto-provision ML models if needed (for new customers)
            if api_key_info.status == APIKeyStatus.TRIAL:
                await self._auto_provision_models(api_key)
            
            # 4. Ingest event to Kinesis for real-time processing
            await self._ingest_event_to_stream(api_key, event_data)
            
            # 5. Cache session data
            await self._cache_session_data(api_key, event_data)
            
            # 6. Process with ML pipeline (parallel execution)
            ml_results = await self._process_with_ml_pipeline(api_key, event_data)
            
            # 7. Update real-time metrics
            metrics = await self._update_real_time_metrics(api_key, event_data, ml_results)
            
            # 8. Calculate processing time
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            return EventProcessingResult(
                success=True,
                anon_id=event_data.get('anonId', 'unknown'),
                session_id=event_data.get('sessionId', 'unknown'),
                features_extracted=ml_results.get('features', {}),
                cluster_assignment=ml_results.get('cluster', {}),
                intent_scores=ml_results.get('intent_scores', {}),
                real_time_metrics=metrics,
                processing_time_ms=processing_time
            )
            
        except Exception as e:
            logger.error(f"Error processing event for {api_key}: {str(e)}")
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            return EventProcessingResult(
                success=False,
                anon_id=event_data.get('anonId', 'unknown'),
                session_id=event_data.get('sessionId', 'unknown'),
                features_extracted={},
                cluster_assignment={},
                intent_scores={},
                real_time_metrics={},
                processing_time_ms=processing_time,
                error=str(e)
            )
    
    async def get_user_insights(self, api_key: str, anon_id: str, 
                              time_window: str = '7d') -> Dict[str, Any]:
        """
        Get comprehensive insights for a user
        
        Args:
            api_key: Customer API key
            anon_id: Anonymous user ID
            time_window: Time window for analysis
            
        Returns:
            Complete user insights
        """
        try:
            # Validate API key
            api_key_info = await self._validate_api_key_async(api_key)
            if not api_key_info:
                return {'error': 'Invalid API key'}
            
            # Get insights in parallel
            tasks = [
                self._get_user_features(api_key, anon_id, time_window),
                self._get_user_cluster_info(api_key, anon_id),
                self._get_user_intent_scores(api_key, anon_id),
                self._get_user_session_summary(api_key, anon_id, time_window)
            ]
            
            features, cluster_info, intent_scores, session_summary = await asyncio.gather(*tasks)
            
            return {
                'anon_id': anon_id,
                'api_key': api_key,
                'time_window': time_window,
                'generated_at': datetime.utcnow().isoformat(),
                'user_features': features,
                'cluster_assignment': cluster_info,
                'intent_scores': intent_scores,
                'session_summary': session_summary,
                'insights': self._generate_user_insights(features, cluster_info, intent_scores)
            }
            
        except Exception as e:
            logger.error(f"Error getting user insights: {str(e)}")
            return {'error': str(e)}
    
    async def get_real_time_dashboard(self, api_key: str, 
                                    time_window: str = '1h') -> Dict[str, Any]:
        """
        Get real-time dashboard data
        
        Args:
            api_key: Customer API key
            time_window: Time window for metrics
            
        Returns:
            Real-time dashboard data
        """
        try:
            # Validate API key
            api_key_info = await self._validate_api_key_async(api_key)
            if not api_key_info:
                return {'error': 'Invalid API key'}
            
            # Get dashboard data from cache and database
            tasks = [
                self._get_cached_metrics(api_key, time_window),
                self._get_cluster_summary(api_key),
                self._get_intent_distribution(api_key, time_window),
                self._get_platform_breakdown(api_key, time_window)
            ]
            
            metrics, cluster_summary, intent_distribution, platform_breakdown = await asyncio.gather(*tasks)
            
            return {
                'api_key': api_key,
                'time_window': time_window,
                'generated_at': datetime.utcnow().isoformat(),
                'live_metrics': metrics,
                'cluster_summary': cluster_summary,
                'intent_distribution': intent_distribution,
                'platform_breakdown': platform_breakdown,
                'status': 'active'
            }
            
        except Exception as e:
            logger.error(f"Error getting dashboard data: {str(e)}")
            return {'error': str(e)}
    
    async def create_api_key(self, customer_id: str, plan_type: str = 'trial',
                           metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Create a new API key with auto-provisioning
        
        Args:
            customer_id: Customer identifier
            plan_type: Plan type (trial, basic, pro, enterprise)
            metadata: Additional metadata
            
        Returns:
            API key information
        """
        try:
            # Generate API key
            api_key = self._generate_api_key(customer_id)
            
            # Determine configuration based on plan
            plan_config = self._get_plan_configuration(plan_type)
            
            # Create API key record
            api_key_info = APIKeyInfo(
                api_key=api_key,
                customer_id=customer_id,
                status=APIKeyStatus.TRIAL if plan_type == 'trial' else APIKeyStatus.ACTIVE,
                plan_type=plan_type,
                created_at=datetime.utcnow().isoformat(),
                rate_limit=plan_config['rate_limit'],
                features_enabled=plan_config['features'],
                metadata=metadata or {}
            )
            
            # Store in DynamoDB
            await self._store_api_key(api_key_info)
            
            # Auto-provision basic infrastructure
            if self.auto_provision_enabled:
                await self._auto_provision_infrastructure(api_key, plan_type)
            
            return {
                'api_key': api_key,
                'status': 'created',
                'plan_type': plan_type,
                'rate_limit': plan_config['rate_limit'],
                'features_enabled': plan_config['features'],
                'trial_expires': (datetime.utcnow() + timedelta(days=self.trial_period_days)).isoformat() if plan_type == 'trial' else None,
                'setup_complete': True
            }
            
        except Exception as e:
            logger.error(f"Error creating API key: {str(e)}")
            return {'error': str(e)}
    
    # Private methods for internal operations
    
    async def _validate_api_key_async(self, api_key: str) -> Optional[APIKeyInfo]:
        """Validate API key with caching"""
        try:
            # Check cache first
            cached_result = await self._invoke_cache_function('validate_api_key', {'api_key': api_key})
            
            if cached_result.get('cached'):
                validation_data = cached_result.get('validation_data', {})
                return APIKeyInfo(**validation_data) if validation_data else None
            
            # Query DynamoDB
            response = self.api_keys_table.get_item(Key={'pk': api_key})
            
            if 'Item' not in response:
                return None
            
            item = response['Item']
            api_key_info = APIKeyInfo(
                api_key=item['pk'],
                customer_id=item.get('gsi1pk', ''),
                status=APIKeyStatus(item.get('status', 'inactive')),
                plan_type=item.get('plan_type', 'trial'),
                created_at=item.get('gsi1sk', ''),
                rate_limit=item.get('rate_limit', 1000),
                features_enabled=item.get('features_enabled', []),
                metadata=item.get('metadata', {})
            )
            
            # Cache the result
            await self._invoke_cache_function('cache_api_key', {
                'api_key': api_key,
                'validation_data': asdict(api_key_info)
            })
            
            return api_key_info
            
        except Exception as e:
            logger.error(f"Error validating API key: {str(e)}")
            return None
    
    async def _check_rate_limit(self, api_key: str, limit: int) -> bool:
        """Check rate limiting using Redis"""
        try:
            # Get current hour metrics
            current_hour = datetime.utcnow().strftime('%Y-%m-%d:%H')
            metrics_result = await self._invoke_cache_function('get_metrics', {
                'api_key': api_key,
                'time_window': 'hour'
            })
            
            if metrics_result.get('statusCode') == 200:
                metrics = json.loads(metrics_result.get('body', '{}')).get('metrics', {})
                event_count = metrics.get('total_events', 0)
                
                return event_count < limit
            
            return True  # Allow if we can't check
            
        except Exception as e:
            logger.error(f"Error checking rate limit: {str(e)}")
            return True  # Allow on error
    
    async def _auto_provision_models(self, api_key: str):
        """Auto-provision ML models for new customers"""
        try:
            # Check if models already exist
            existing_models = await self._check_existing_models(api_key)
            
            if not existing_models:
                # Start async model training with sample data
                logger.info(f"Auto-provisioning models for {api_key}")
                
                # This would typically trigger async Lambda functions
                # For now, we'll create placeholder models
                tasks = [
                    self._provision_clustering_models(api_key),
                    self._provision_intent_models(api_key)
                ]
                
                await asyncio.gather(*tasks, return_exceptions=True)
                
        except Exception as e:
            logger.error(f"Error auto-provisioning models: {str(e)}")
    
    async def _ingest_event_to_stream(self, api_key: str, event_data: Dict):
        """Ingest event to Kinesis stream"""
        try:
            # Add API key to event data
            enriched_event = {
                **event_data,
                'apiKey': api_key,
                'ingestionTime': datetime.utcnow().isoformat(),
                'eventId': event_data.get('eventId', str(uuid.uuid4()))
            }
            
            # Send to Kinesis
            response = self.kinesis_client.put_record(
                StreamName=self.kinesis_stream_name,
                Data=json.dumps(enriched_event),
                PartitionKey=f"{api_key}#{event_data.get('anonId', 'unknown')}"
            )
            
            logger.debug(f"Event ingested to Kinesis: {response.get('SequenceNumber')}")
            
        except Exception as e:
            logger.error(f"Error ingesting event to stream: {str(e)}")
    
    async def _cache_session_data(self, api_key: str, event_data: Dict):
        """Cache session data in Redis"""
        try:
            session_data = {
                'session_id': event_data.get('sessionId'),
                'anon_id': event_data.get('anonId'),
                'api_key': api_key,
                'last_activity': datetime.utcnow().isoformat(),
                'platform': event_data.get('platform'),
                'event_count': 1
            }
            
            await self._invoke_cache_function('cache_session', {'session_data': session_data})
            
        except Exception as e:
            logger.error(f"Error caching session data: {str(e)}")
    
    async def _process_with_ml_pipeline(self, api_key: str, event_data: Dict) -> Dict[str, Any]:
        """Process event through ML pipeline"""
        try:
            anon_id = event_data.get('anonId')
            
            # Run ML services in parallel for performance
            with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                # Feature extraction
                feature_future = executor.submit(
                    self.feature_service.extract_features,
                    api_key, anon_id, '7d'
                )
                
                # Wait for features before running clustering and intent scoring
                features = feature_future.result()
                
                if features:
                    # Clustering and intent scoring can run in parallel
                    cluster_future = executor.submit(
                        self.clustering_service.predict_cluster,
                        api_key, anon_id, features
                    )
                    
                    intent_future = executor.submit(
                        self.intent_service.predict_intent_scores,
                        api_key, anon_id, features
                    )
                    
                    cluster_result = cluster_future.result()
                    intent_result = intent_future.result()
                else:
                    cluster_result = {}
                    intent_result = {}
            
            return {
                'features': features,
                'cluster': cluster_result,
                'intent_scores': intent_result
            }
            
        except Exception as e:
            logger.error(f"Error in ML pipeline: {str(e)}")
            return {'features': {}, 'cluster': {}, 'intent_scores': {}}
    
    async def _update_real_time_metrics(self, api_key: str, event_data: Dict, 
                                      ml_results: Dict) -> Dict[str, Any]:
        """Update real-time metrics"""
        try:
            metrics = {
                'total_events': 1,
                'unique_sessions': 1 if event_data.get('sessionId') else 0,
                'unique_users': 1 if event_data.get('anonId') else 0,
                'platform_' + event_data.get('platform', 'unknown'): 1,
                'event_' + event_data.get('eventName', 'unknown'): 1
            }
            
            # Add ML metrics if available
            if ml_results.get('cluster', {}).get('cluster_id'):
                metrics[f"cluster_{ml_results['cluster']['cluster_id']}"] = 1
            
            if ml_results.get('intent_scores'):
                primary_intent = max(ml_results['intent_scores'].items(), 
                                   key=lambda x: x[1], default=(None, 0))[0]
                if primary_intent:
                    metrics[f"intent_{primary_intent}"] = 1
            
            # Update cache
            await self._invoke_cache_function('update_metrics', {
                'api_key': api_key,
                'metrics': metrics
            })
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error updating metrics: {str(e)}")
            return {}
    
    async def _invoke_cache_function(self, operation: str, payload: Dict) -> Dict:
        """Invoke Redis cache Lambda function"""
        try:
            response = self.lambda_client.invoke(
                FunctionName=self.cache_function_name,
                InvocationType='RequestResponse',
                Payload=json.dumps({
                    'operation': operation,
                    **payload
                })
            )
            
            result = json.loads(response['Payload'].read())
            return json.loads(result.get('body', '{}')) if result.get('body') else result
            
        except Exception as e:
            logger.error(f"Error invoking cache function: {str(e)}")
            return {}
    
    async def _get_user_features(self, api_key: str, anon_id: str, time_window: str) -> Dict:
        """Get user features"""
        try:
            return self.feature_service.extract_features(api_key, anon_id, time_window)
        except Exception as e:
            logger.error(f"Error getting user features: {str(e)}")
            return {}
    
    async def _get_user_cluster_info(self, api_key: str, anon_id: str) -> Dict:
        """Get user cluster information"""
        try:
            # Get latest cluster assignment
            response = self.clusters_table.query(
                KeyConditionExpression='pk = :pk AND begins_with(sk, :sk_prefix)',
                ExpressionAttributeValues={
                    ':pk': f"{api_key}#{anon_id}",
                    ':sk_prefix': 'cluster_assignment'
                },
                ScanIndexForward=False,
                Limit=1
            )
            
            items = response.get('Items', [])
            return items[0] if items else {}
            
        except Exception as e:
            logger.error(f"Error getting cluster info: {str(e)}")
            return {}
    
    async def _get_user_intent_scores(self, api_key: str, anon_id: str) -> Dict:
        """Get user intent scores"""
        try:
            # Get latest prediction
            response = self.feature_store_table.query(
                KeyConditionExpression='pk = :pk AND begins_with(sk, :sk_prefix)',
                ExpressionAttributeValues={
                    ':pk': f"{api_key}#{anon_id}",
                    ':sk_prefix': 'prediction'
                },
                ScanIndexForward=False,
                Limit=1
            )
            
            items = response.get('Items', [])
            return items[0].get('prediction_data', {}) if items else {}
            
        except Exception as e:
            logger.error(f"Error getting intent scores: {str(e)}")
            return {}
    
    async def _get_user_session_summary(self, api_key: str, anon_id: str, time_window: str) -> Dict:
        """Get user session summary"""
        try:
            # Get sessions from cache first
            cached_sessions = await self._invoke_cache_function('get_session', {
                'api_key': api_key,
                'session_id': 'latest'  # Would need to modify cache function
            })
            
            # Fallback to DynamoDB
            response = self.sessions_table.query(
                KeyConditionExpression='pk = :pk',
                ExpressionAttributeValues={':pk': f"{api_key}#{anon_id}"},
                ScanIndexForward=False,
                Limit=10
            )
            
            sessions = response.get('Items', [])
            
            if sessions:
                total_duration = sum(s.get('gsi1sk', 0) for s in sessions if isinstance(s.get('gsi1sk'), (int, float)))
                avg_duration = total_duration / len(sessions) if sessions else 0
                
                return {
                    'total_sessions': len(sessions),
                    'avg_duration': avg_duration,
                    'total_duration': total_duration,
                    'last_session': sessions[0] if sessions else {}
                }
            
            return {}
            
        except Exception as e:
            logger.error(f"Error getting session summary: {str(e)}")
            return {}
    
    def _generate_user_insights(self, features: Dict, cluster_info: Dict, intent_scores: Dict) -> Dict:
        """Generate human-readable insights"""
        insights = {
            'behavioral_type': 'unknown',
            'engagement_level': 'medium',
            'primary_intent': 'browse',
            'recommendations': []
        }
        
        try:
            # Determine behavioral type from cluster
            if cluster_info.get('cluster_id'):
                cluster_id = cluster_info['cluster_id']
                insights['behavioral_type'] = f"user_type_{cluster_id}"
            
            # Determine engagement level
            engagement_score = features.get('engagement_score', 0.5)
            if engagement_score > 0.7:
                insights['engagement_level'] = 'high'
            elif engagement_score < 0.3:
                insights['engagement_level'] = 'low'
            
            # Determine primary intent
            if intent_scores.get('intent_scores'):
                primary_intent = max(intent_scores['intent_scores'].items(), 
                                   key=lambda x: x[1], default=('browse', 0))[0]
                insights['primary_intent'] = primary_intent
            
            # Generate recommendations
            recommendations = []
            
            if engagement_score < 0.3:
                recommendations.append("Consider showing more engaging content")
            
            if intent_scores.get('intent_scores', {}).get('purchase_intent', 0) > 0.7:
                recommendations.append("High purchase intent - show relevant offers")
            
            if cluster_info.get('is_outlier'):
                recommendations.append("Unusual behavior pattern detected")
            
            insights['recommendations'] = recommendations
            
        except Exception as e:
            logger.error(f"Error generating insights: {str(e)}")
        
        return insights
    
    async def _get_cached_metrics(self, api_key: str, time_window: str) -> Dict:
        """Get cached metrics"""
        try:
            return await self._invoke_cache_function('get_metrics', {
                'api_key': api_key,
                'time_window': time_window
            })
        except Exception as e:
            logger.error(f"Error getting cached metrics: {str(e)}")
            return {}
    
    async def _get_cluster_summary(self, api_key: str) -> Dict:
        """Get cluster summary"""
        try:
            return self.clustering_service.get_cluster_insights(api_key)
        except Exception as e:
            logger.error(f"Error getting cluster summary: {str(e)}")
            return {}
    
    async def _get_intent_distribution(self, api_key: str, time_window: str) -> Dict:
        """Get intent distribution"""
        try:
            return self.intent_service.get_feature_importance(api_key)
        except Exception as e:
            logger.error(f"Error getting intent distribution: {str(e)}")
            return {}
    
    async def _get_platform_breakdown(self, api_key: str, time_window: str) -> Dict:
        """Get platform breakdown from metrics"""
        try:
            metrics = await self._get_cached_metrics(api_key, time_window)
            
            platforms = {}
            for key, value in metrics.get('metrics', {}).items():
                if key.startswith('platform_'):
                    platform = key.replace('platform_', '')
                    platforms[platform] = value
            
            return platforms
            
        except Exception as e:
            logger.error(f"Error getting platform breakdown: {str(e)}")
            return {}
    
    def _generate_api_key(self, customer_id: str) -> str:
        """Generate a unique API key"""
        unique_part = str(uuid.uuid4()).replace('-', '')
        customer_hash = hashlib.md5(customer_id.encode()).hexdigest()[:8]
        timestamp = str(int(datetime.utcnow().timestamp()))[-6:]
        
        return f"ak_{customer_hash}_{timestamp}_{unique_part[:16]}"
    
    def _get_plan_configuration(self, plan_type: str) -> Dict:
        """Get configuration for plan type"""
        configs = {
            'trial': {
                'rate_limit': 1000,
                'features': ['basic_analytics', 'intent_scoring']
            },
            'basic': {
                'rate_limit': 10000,
                'features': ['basic_analytics', 'intent_scoring', 'clustering']
            },
            'pro': {
                'rate_limit': 100000,
                'features': ['basic_analytics', 'intent_scoring', 'clustering', 'advanced_features']
            },
            'enterprise': {
                'rate_limit': 1000000,
                'features': ['basic_analytics', 'intent_scoring', 'clustering', 'advanced_features', 'custom_models']
            }
        }
        
        return configs.get(plan_type, configs['trial'])
    
    async def _store_api_key(self, api_key_info: APIKeyInfo):
        """Store API key in DynamoDB"""
        try:
            self.api_keys_table.put_item(
                Item={
                    'pk': api_key_info.api_key,
                    'gsi1pk': api_key_info.customer_id,
                    'gsi1sk': api_key_info.created_at,
                    'status': api_key_info.status.value,
                    'plan_type': api_key_info.plan_type,
                    'rate_limit': api_key_info.rate_limit,
                    'features_enabled': api_key_info.features_enabled,
                    'metadata': api_key_info.metadata
                }
            )
        except Exception as e:
            logger.error(f"Error storing API key: {str(e)}")
            raise
    
    async def _auto_provision_infrastructure(self, api_key: str, plan_type: str):
        """Auto-provision infrastructure for new API key"""
        try:
            logger.info(f"Auto-provisioning infrastructure for {api_key}")
            
            # This would trigger CloudFormation stack creation
            # For demo, we'll simulate the process
            await asyncio.sleep(0.1)  # Simulate async provisioning
            
            logger.info(f"Infrastructure provisioned for {api_key}")
            
        except Exception as e:
            logger.error(f"Error auto-provisioning infrastructure: {str(e)}")
    
    async def _check_existing_models(self, api_key: str) -> bool:
        """Check if ML models exist for API key"""
        try:
            # Check for clustering models
            response = self.clusters_table.query(
                KeyConditionExpression='pk = :pk AND begins_with(sk, :sk_prefix)',
                ExpressionAttributeValues={
                    ':pk': f"{api_key}#model",
                    ':sk_prefix': '2025'  # Current year
                },
                Limit=1
            )
            
            return len(response.get('Items', [])) > 0
            
        except Exception as e:
            logger.error(f"Error checking existing models: {str(e)}")
            return False
    
    async def _provision_clustering_models(self, api_key: str):
        """Provision clustering models with sample data"""
        try:
            # This would typically trigger model training with sample data
            # For demo, we'll create a placeholder
            logger.info(f"Provisioning clustering models for {api_key}")
            await asyncio.sleep(0.1)
            
        except Exception as e:
            logger.error(f"Error provisioning clustering models: {str(e)}")
    
    async def _provision_intent_models(self, api_key: str):
        """Provision intent scoring models with sample data"""
        try:
            # This would typically trigger model training with sample data
            # For demo, we'll create a placeholder
            logger.info(f"Provisioning intent models for {api_key}")
            await asyncio.sleep(0.1)
            
        except Exception as e:
            logger.error(f"Error provisioning intent models: {str(e)}")

# FastAPI/Lambda handler example
def lambda_handler(event, context):
    """
    AWS Lambda handler for the unified API
    """
    try:
        # Initialize service
        service = UnifiedAPIService(
            environment=os.environ.get('ENVIRONMENT', 'production'),
            aws_region=os.environ.get('AWS_REGION', 'us-east-1')
        )
        
        # Route based on path and method
        path = event.get('path', '/')
        method = event.get('httpMethod', 'GET')
        
        if path == '/v1/events' and method == 'POST':
            # Process event
            body = json.loads(event.get('body', '{}'))
            api_key = event.get('headers', {}).get('x-api-key')
            
            if not api_key:
                return {
                    'statusCode': 401,
                    'body': json.dumps({'error': 'API key required'})
                }
            
            # Run async processing
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                result = loop.run_until_complete(
                    service.process_event(api_key, body)
                )
                
                return {
                    'statusCode': 200 if result.success else 400,
                    'body': json.dumps(asdict(result))
                }
            finally:
                loop.close()
        
        elif path == '/v1/insights' and method == 'GET':
            # Get user insights
            api_key = event.get('headers', {}).get('x-api-key')
            anon_id = event.get('queryStringParameters', {}).get('anon_id')
            
            if not all([api_key, anon_id]):
                return {
                    'statusCode': 400,
                    'body': json.dumps({'error': 'API key and anon_id required'})
                }
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                result = loop.run_until_complete(
                    service.get_user_insights(api_key, anon_id)
                )
                
                return {
                    'statusCode': 200,
                    'body': json.dumps(result)
                }
            finally:
                loop.close()
        
        elif path == '/v1/dashboard' and method == 'GET':
            # Get dashboard data
            api_key = event.get('headers', {}).get('x-api-key')
            
            if not api_key:
                return {
                    'statusCode': 401,
                    'body': json.dumps({'error': 'API key required'})
                }
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                result = loop.run_until_complete(
                    service.get_real_time_dashboard(api_key)
                )
                
                return {
                    'statusCode': 200,
                    'body': json.dumps(result)
                }
            finally:
                loop.close()
        
        else:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Not found'})
            }
            
    except Exception as e:
        logger.error(f"Error in Lambda handler: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

# Example usage
if __name__ == "__main__":
    import asyncio
    
    async def main():
        # Initialize service
        service = UnifiedAPIService(environment='development')
        
        # Create API key
        api_key_result = await service.create_api_key(
            customer_id='demo-customer-123',
            plan_type='trial'
        )
        print("API Key Created:", json.dumps(api_key_result, indent=2))
        
        if 'api_key' in api_key_result:
            api_key = api_key_result['api_key']
            
            # Process sample event
            sample_event = {
                'eventId': str(uuid.uuid4()),
                'eventName': 'page_view',
                'anonId': 'anon-demo-user',
                'sessionId': 'session-demo-123',
                'timestamp': datetime.utcnow().isoformat(),
                'platform': 'web',
                'properties': {
                    'page_url': '/demo-page',
                    'scroll_depth': 75
                }
            }
            
            result = await service.process_event(api_key, sample_event)
            print("Event Processing Result:", json.dumps(asdict(result), indent=2))
            
            # Get insights
            insights = await service.get_user_insights(api_key, 'anon-demo-user')
            print("User Insights:", json.dumps(insights, indent=2))
            
            # Get dashboard
            dashboard = await service.get_real_time_dashboard(api_key)
            print("Dashboard Data:", json.dumps(dashboard, indent=2))
    
    # Run the example
    asyncio.run(main())