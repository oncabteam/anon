"""
OnCabaret Anonymous Intent SDK - Clustering Service
K-Means implementation for user grouping and DBSCAN for outlier detection
"""

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans, DBSCAN
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score, calinski_harabasz_score
from sklearn.model_selection import ParameterGrid
import boto3
from boto3.dynamodb.conditions import Key
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any
import pickle
import joblib
from dataclasses import dataclass
import uuid

logger = logging.getLogger(__name__)

@dataclass
class ClusterConfig:
    """Configuration for clustering algorithms"""
    kmeans_max_clusters: int = 10
    kmeans_min_clusters: int = 2
    dbscan_eps_range: Tuple[float, float] = (0.1, 2.0)
    dbscan_min_samples_range: Tuple[int, int] = (3, 10)
    min_samples_for_clustering: int = 50
    feature_selection_threshold: float = 0.05
    outlier_threshold: float = 0.05
    update_frequency_hours: int = 6

class ClusteringService:
    """
    Service for clustering anonymous users based on behavioral features
    Implements K-Means for grouping and DBSCAN for outlier detection
    """
    
    def __init__(self,
                 feature_store_table_name: str,
                 clusters_table_name: str,
                 s3_bucket_name: str,
                 config: ClusterConfig = None):
        self.feature_store_table_name = feature_store_table_name
        self.clusters_table_name = clusters_table_name
        self.s3_bucket_name = s3_bucket_name
        self.config = config or ClusterConfig()
        
        # Initialize AWS clients
        self.dynamodb = boto3.resource('dynamodb')
        self.s3_client = boto3.client('s3')
        self.feature_store_table = self.dynamodb.Table(feature_store_table_name)
        self.clusters_table = self.dynamodb.Table(clusters_table_name)
        
        # Initialize ML components
        self.scaler = StandardScaler()
        self.robust_scaler = RobustScaler()
        self.pca = PCA()
        self.kmeans_models = {}
        self.dbscan_models = {}
        self.feature_columns = []
        self.last_update_time = {}
        
    def train_clusters(self, api_key: str, force_retrain: bool = False) -> Dict[str, Any]:
        """
        Train clustering models for a specific API key
        
        Args:
            api_key: Customer API key
            force_retrain: Force retraining even if recent model exists
            
        Returns:
            Dictionary with training results and model info
        """
        try:
            # Check if we need to retrain
            if not force_retrain and self._should_skip_training(api_key):
                logger.info(f"Skipping training for {api_key} - recent model exists")
                return {'status': 'skipped', 'reason': 'recent_model_exists'}
            
            # Load features for all users of this API key
            features_df = self._load_features(api_key)
            
            if len(features_df) < self.config.min_samples_for_clustering:
                logger.warning(f"Insufficient data for clustering: {len(features_df)} samples")
                return {'status': 'failed', 'reason': 'insufficient_data', 'samples': len(features_df)}
            
            # Preprocess features
            processed_features, feature_info = self._preprocess_features(features_df)
            
            # Train K-Means clusters
            kmeans_result = self._train_kmeans(api_key, processed_features)
            
            # Train DBSCAN for outlier detection
            dbscan_result = self._train_dbscan(api_key, processed_features)
            
            # Generate cluster insights
            insights = self._generate_cluster_insights(features_df, kmeans_result, dbscan_result)
            
            # Store models and results
            model_info = self._store_models(api_key, kmeans_result, dbscan_result, feature_info)
            
            # Update cluster assignments for all users
            assignments = self._update_cluster_assignments(api_key, features_df, processed_features)
            
            result = {
                'status': 'success',
                'api_key': api_key,
                'training_time': datetime.utcnow().isoformat(),
                'samples_processed': len(features_df),
                'kmeans': kmeans_result,
                'dbscan': dbscan_result,
                'insights': insights,
                'model_info': model_info,
                'assignments_updated': len(assignments)
            }
            
            # Store training results
            self._store_training_results(api_key, result)
            
            return result
            
        except Exception as e:
            logger.error(f"Error training clusters for {api_key}: {str(e)}")
            return {'status': 'error', 'error': str(e)}
    
    def predict_cluster(self, api_key: str, anon_id: str, features: Dict) -> Dict[str, Any]:
        """
        Predict cluster assignment for a new user
        
        Args:
            api_key: Customer API key
            anon_id: Anonymous user ID
            features: User features dictionary
            
        Returns:
            Cluster prediction results
        """
        try:
            # Load models for this API key
            models = self._load_models(api_key)
            if not models:
                logger.warning(f"No models found for {api_key}")
                return {'status': 'no_models', 'cluster_id': 'default', 'outlier_score': 0.5}
            
            # Prepare features
            feature_vector = self._prepare_feature_vector(features, models['feature_columns'])
            
            if feature_vector is None:
                return {'status': 'invalid_features', 'cluster_id': 'default', 'outlier_score': 0.5}
            
            # Scale features
            scaled_features = models['scaler'].transform([feature_vector])
            
            # K-Means prediction
            kmeans_cluster = models['kmeans'].predict(scaled_features)[0]
            kmeans_distance = np.min(models['kmeans'].transform(scaled_features))
            
            # DBSCAN outlier detection
            dbscan_label = models['dbscan'].fit_predict(scaled_features)[0]
            is_outlier = dbscan_label == -1
            outlier_score = self._calculate_outlier_score(scaled_features[0], models)
            
            # Generate cluster assignment
            cluster_assignment = {
                'anon_id': anon_id,
                'api_key': api_key,
                'cluster_id': f"cluster_{kmeans_cluster}",
                'cluster_distance': float(kmeans_distance),
                'is_outlier': bool(is_outlier),
                'outlier_score': float(outlier_score),
                'prediction_time': datetime.utcnow().isoformat(),
                'model_version': models.get('version', '1.0')
            }
            
            # Store cluster assignment
            self._store_cluster_assignment(api_key, anon_id, cluster_assignment)
            
            return cluster_assignment
            
        except Exception as e:
            logger.error(f"Error predicting cluster for {anon_id}: {str(e)}")
            return {'status': 'error', 'cluster_id': 'default', 'outlier_score': 0.5}
    
    def get_cluster_insights(self, api_key: str, cluster_id: str = None) -> Dict[str, Any]:
        """
        Get insights about clusters for an API key
        
        Args:
            api_key: Customer API key
            cluster_id: Specific cluster ID (optional)
            
        Returns:
            Cluster insights and statistics
        """
        try:
            # Load cluster data
            clusters = self._load_cluster_data(api_key, cluster_id)
            
            if not clusters:
                return {'status': 'no_data', 'clusters': []}
            
            # Generate insights
            insights = []
            for cluster in clusters:
                cluster_insight = {
                    'cluster_id': cluster['cluster_id'],
                    'size': cluster.get('size', 0),
                    'characteristics': cluster.get('characteristics', {}),
                    'behavior_patterns': cluster.get('behavior_patterns', {}),
                    'intent_profile': cluster.get('intent_profile', {}),
                    'outlier_rate': cluster.get('outlier_rate', 0),
                    'last_updated': cluster.get('last_updated', '')
                }
                insights.append(cluster_insight)
            
            return {
                'status': 'success',
                'api_key': api_key,
                'total_clusters': len(insights),
                'clusters': insights,
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting cluster insights for {api_key}: {str(e)}")
            return {'status': 'error', 'error': str(e)}
    
    def _load_features(self, api_key: str, limit: int = 10000) -> pd.DataFrame:
        """Load features for all users of an API key"""
        try:
            # Query feature store for this API key
            gsi1pk = f"{api_key}#features"
            
            response = self.feature_store_table.query(
                IndexName='GSI1-FeaturesByType',
                KeyConditionExpression=Key('gsi1pk').eq(gsi1pk),
                ScanIndexForward=False,  # Most recent first
                Limit=limit
            )
            
            items = response.get('Items', [])
            
            if not items:
                return pd.DataFrame()
            
            # Extract features from items
            features_list = []
            for item in items:
                features = item.get('features', {})
                if isinstance(features, dict) and features:
                    features['anon_id'] = features.get('anon_id', item.get('pk', '').split('#')[-1])
                    features_list.append(features)
            
            return pd.DataFrame(features_list)
            
        except Exception as e:
            logger.error(f"Error loading features for {api_key}: {str(e)}")
            return pd.DataFrame()
    
    def _preprocess_features(self, df: pd.DataFrame) -> Tuple[np.ndarray, Dict]:
        """Preprocess features for clustering"""
        # Select numeric features only
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        # Remove ID columns and metadata
        exclude_cols = ['anon_id', 'api_key', 'extraction_time', 'time_window', 'event_count']
        feature_cols = [col for col in numeric_cols if col not in exclude_cols]
        
        if not feature_cols:
            raise ValueError("No numeric features available for clustering")
        
        # Handle missing values
        feature_df = df[feature_cols].fillna(0)
        
        # Remove low-variance features
        feature_variance = feature_df.var()
        high_variance_cols = feature_variance[feature_variance > self.config.feature_selection_threshold].index.tolist()
        
        if not high_variance_cols:
            # Keep all features if variance filtering removes everything
            high_variance_cols = feature_cols
        
        feature_df = feature_df[high_variance_cols]
        
        # Scale features
        scaled_features = self.scaler.fit_transform(feature_df)
        
        feature_info = {
            'feature_columns': high_variance_cols,
            'n_features': len(high_variance_cols),
            'n_samples': len(scaled_features),
            'scaler_params': {
                'mean': self.scaler.mean_.tolist(),
                'scale': self.scaler.scale_.tolist()
            }
        }
        
        return scaled_features, feature_info
    
    def _train_kmeans(self, api_key: str, features: np.ndarray) -> Dict:
        """Train K-Means clustering"""
        best_score = -1
        best_k = 2
        best_model = None
        scores = {}
        
        # Try different numbers of clusters
        for k in range(self.config.kmeans_min_clusters, 
                      min(self.config.kmeans_max_clusters + 1, len(features))):
            try:
                kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
                cluster_labels = kmeans.fit_predict(features)
                
                # Calculate silhouette score
                if len(set(cluster_labels)) > 1:
                    score = silhouette_score(features, cluster_labels)
                    scores[k] = score
                    
                    if score > best_score:
                        best_score = score
                        best_k = k
                        best_model = kmeans
                
            except Exception as e:
                logger.warning(f"Error training K-Means with k={k}: {str(e)}")
                continue
        
        if best_model is None:
            # Fallback to simple 2-cluster model
            best_model = KMeans(n_clusters=2, random_state=42)
            best_model.fit(features)
            best_k = 2
            best_score = 0
        
        # Calculate additional metrics
        cluster_labels = best_model.labels_
        inertia = best_model.inertia_
        
        try:
            calinski_score = calinski_harabasz_score(features, cluster_labels)
        except:
            calinski_score = 0
        
        return {
            'model': best_model,
            'n_clusters': best_k,
            'silhouette_score': best_score,
            'calinski_score': calinski_score,
            'inertia': inertia,
            'cluster_sizes': np.bincount(cluster_labels).tolist(),
            'all_scores': scores
        }
    
    def _train_dbscan(self, api_key: str, features: np.ndarray) -> Dict:
        """Train DBSCAN for outlier detection"""
        best_score = -1
        best_model = None
        best_params = {}
        
        # Parameter grid search
        eps_values = np.linspace(self.config.dbscan_eps_range[0], 
                                self.config.dbscan_eps_range[1], 5)
        min_samples_values = range(self.config.dbscan_min_samples_range[0],
                                  self.config.dbscan_min_samples_range[1] + 1)
        
        for eps in eps_values:
            for min_samples in min_samples_values:
                try:
                    dbscan = DBSCAN(eps=eps, min_samples=min_samples)
                    cluster_labels = dbscan.fit_predict(features)
                    
                    # Check if we have valid clusters (not all noise)
                    n_clusters = len(set(cluster_labels)) - (1 if -1 in cluster_labels else 0)
                    
                    if n_clusters > 0:
                        # Calculate silhouette score (excluding noise points)
                        non_noise_mask = cluster_labels != -1
                        if np.sum(non_noise_mask) > 0 and len(set(cluster_labels[non_noise_mask])) > 1:
                            score = silhouette_score(features[non_noise_mask], 
                                                   cluster_labels[non_noise_mask])
                            
                            if score > best_score:
                                best_score = score
                                best_model = dbscan
                                best_params = {'eps': eps, 'min_samples': min_samples}
                
                except Exception as e:
                    continue
        
        if best_model is None:
            # Fallback to default DBSCAN
            best_model = DBSCAN(eps=0.5, min_samples=5)
            best_model.fit(features)
            best_params = {'eps': 0.5, 'min_samples': 5}
            best_score = 0
        
        # Calculate outlier statistics
        cluster_labels = best_model.labels_
        n_outliers = np.sum(cluster_labels == -1)
        outlier_rate = n_outliers / len(cluster_labels) if len(cluster_labels) > 0 else 0
        
        return {
            'model': best_model,
            'best_params': best_params,
            'silhouette_score': best_score,
            'n_outliers': n_outliers,
            'outlier_rate': outlier_rate,
            'n_clusters': len(set(cluster_labels)) - (1 if -1 in cluster_labels else 0)
        }
    
    def _generate_cluster_insights(self, features_df: pd.DataFrame, 
                                 kmeans_result: Dict, dbscan_result: Dict) -> Dict:
        """Generate insights about the clusters"""
        insights = {}
        
        if kmeans_result['model'] is None:
            return insights
        
        cluster_labels = kmeans_result['model'].labels_
        
        # Analyze each cluster
        for cluster_id in range(kmeans_result['n_clusters']):
            cluster_mask = cluster_labels == cluster_id
            cluster_data = features_df[cluster_mask]
            
            if len(cluster_data) == 0:
                continue
            
            # Calculate cluster characteristics
            characteristics = {}
            behavior_patterns = {}
            intent_profile = {}
            
            # Numeric feature analysis
            numeric_cols = cluster_data.select_dtypes(include=[np.number]).columns
            for col in numeric_cols:
                if col not in ['anon_id', 'api_key']:
                    characteristics[col] = {
                        'mean': float(cluster_data[col].mean()),
                        'std': float(cluster_data[col].std()),
                        'median': float(cluster_data[col].median())
                    }
            
            # Behavior patterns
            if 'click_frequency' in cluster_data.columns:
                behavior_patterns['click_behavior'] = 'high' if cluster_data['click_frequency'].mean() > cluster_data['click_frequency'].median() else 'low'
            
            if 'scroll_engagement' in cluster_data.columns:
                behavior_patterns['scroll_engagement'] = 'high' if cluster_data['scroll_engagement'].mean() > 0.5 else 'low'
            
            if 'session_count' in cluster_data.columns:
                behavior_patterns['session_activity'] = 'frequent' if cluster_data['session_count'].mean() > 2 else 'occasional'
            
            # Intent profile
            intent_cols = [col for col in cluster_data.columns if 'intent' in col.lower()]
            for col in intent_cols:
                if cluster_data[col].mean() > 0.1:  # Threshold for significant intent
                    intent_profile[col] = float(cluster_data[col].mean())
            
            insights[f'cluster_{cluster_id}'] = {
                'size': int(np.sum(cluster_mask)),
                'percentage': float(np.sum(cluster_mask) / len(cluster_labels) * 100),
                'characteristics': characteristics,
                'behavior_patterns': behavior_patterns,
                'intent_profile': intent_profile
            }
        
        return insights
    
    def _store_models(self, api_key: str, kmeans_result: Dict, 
                     dbscan_result: Dict, feature_info: Dict) -> Dict:
        """Store trained models in S3"""
        try:
            model_id = str(uuid.uuid4())
            model_key = f"models/{api_key}/{model_id}"
            
            # Prepare model package
            model_package = {
                'kmeans_model': kmeans_result['model'],
                'dbscan_model': dbscan_result['model'],
                'scaler': self.scaler,
                'feature_info': feature_info,
                'training_time': datetime.utcnow().isoformat(),
                'version': '1.0'
            }
            
            # Serialize model
            model_data = pickle.dumps(model_package)
            
            # Upload to S3
            self.s3_client.put_object(
                Bucket=self.s3_bucket_name,
                Key=f"{model_key}/model.pkl",
                Body=model_data,
                Metadata={
                    'api_key': api_key,
                    'model_id': model_id,
                    'training_time': datetime.utcnow().isoformat(),
                    'n_clusters': str(kmeans_result['n_clusters']),
                    'samples_trained': str(feature_info['n_samples'])
                }
            )
            
            # Store model metadata in DynamoDB
            self._store_model_metadata(api_key, model_id, kmeans_result, dbscan_result, feature_info)
            
            return {
                'model_id': model_id,
                'model_key': model_key,
                'size_bytes': len(model_data),
                's3_location': f"s3://{self.s3_bucket_name}/{model_key}/model.pkl"
            }
            
        except Exception as e:
            logger.error(f"Error storing models: {str(e)}")
            return {}
    
    def _store_model_metadata(self, api_key: str, model_id: str, 
                             kmeans_result: Dict, dbscan_result: Dict, feature_info: Dict):
        """Store model metadata in DynamoDB"""
        try:
            pk = f"{api_key}#model"
            sk = f"{datetime.utcnow().isoformat()}#{model_id}"
            
            # Calculate TTL (90 days)
            ttl = int((datetime.utcnow() + timedelta(days=90)).timestamp())
            
            self.clusters_table.put_item(
                Item={
                    'pk': pk,
                    'sk': sk,
                    'gsi1pk': api_key,
                    'gsi1sk': datetime.utcnow().isoformat(),
                    'ttl': ttl,
                    'model_id': model_id,
                    'model_type': 'kmeans_dbscan',
                    'n_clusters': kmeans_result['n_clusters'],
                    'silhouette_score': kmeans_result['silhouette_score'],
                    'outlier_rate': dbscan_result['outlier_rate'],
                    'n_features': feature_info['n_features'],
                    'n_samples': feature_info['n_samples'],
                    'training_time': datetime.utcnow().isoformat(),
                    'version': '1.0'
                }
            )
            
        except Exception as e:
            logger.error(f"Error storing model metadata: {str(e)}")
    
    def _update_cluster_assignments(self, api_key: str, features_df: pd.DataFrame, 
                                  processed_features: np.ndarray) -> List[Dict]:
        """Update cluster assignments for all users"""
        assignments = []
        
        if 'model' not in self.kmeans_models.get(api_key, {}):
            return assignments
        
        kmeans_model = self.kmeans_models[api_key]['model']
        dbscan_model = self.dbscan_models[api_key]['model']
        
        # Predict clusters for all users
        kmeans_labels = kmeans_model.predict(processed_features)
        dbscan_labels = dbscan_model.fit_predict(processed_features)
        
        for i, (idx, row) in enumerate(features_df.iterrows()):
            anon_id = row.get('anon_id', f'unknown_{i}')
            
            assignment = {
                'anon_id': anon_id,
                'api_key': api_key,
                'cluster_id': f"cluster_{kmeans_labels[i]}",
                'is_outlier': bool(dbscan_labels[i] == -1),
                'outlier_score': 0.5,  # Would calculate proper score
                'assignment_time': datetime.utcnow().isoformat()
            }
            
            # Store assignment
            self._store_cluster_assignment(api_key, anon_id, assignment)
            assignments.append(assignment)
        
        return assignments
    
    def _store_cluster_assignment(self, api_key: str, anon_id: str, assignment: Dict):
        """Store cluster assignment in DynamoDB"""
        try:
            pk = f"{api_key}#{anon_id}"
            sk = f"cluster_assignment#{datetime.utcnow().isoformat()}"
            
            # Calculate TTL (30 days)
            ttl = int((datetime.utcnow() + timedelta(days=30)).timestamp())
            
            self.clusters_table.put_item(
                Item={
                    'pk': pk,
                    'sk': sk,
                    'gsi1pk': api_key,
                    'gsi1sk': datetime.utcnow().isoformat(),
                    'ttl': ttl,
                    **assignment
                }
            )
            
        except Exception as e:
            logger.error(f"Error storing cluster assignment: {str(e)}")
    
    def _should_skip_training(self, api_key: str) -> bool:
        """Check if we should skip training based on recent models"""
        last_update = self.last_update_time.get(api_key)
        if not last_update:
            return False
        
        time_since_update = datetime.utcnow() - last_update
        return time_since_update.total_seconds() < (self.config.update_frequency_hours * 3600)
    
    def _load_models(self, api_key: str) -> Optional[Dict]:
        """Load latest models for an API key"""
        try:
            # Query for latest model
            pk = f"{api_key}#model"
            
            response = self.clusters_table.query(
                KeyConditionExpression=Key('pk').eq(pk),
                ScanIndexForward=False,  # Most recent first
                Limit=1
            )
            
            items = response.get('Items', [])
            if not items:
                return None
            
            model_item = items[0]
            model_id = model_item.get('model_id')
            
            if not model_id:
                return None
            
            # Load model from S3
            model_key = f"models/{api_key}/{model_id}/model.pkl"
            
            response = self.s3_client.get_object(
                Bucket=self.s3_bucket_name,
                Key=model_key
            )
            
            model_package = pickle.loads(response['Body'].read())
            
            return {
                'kmeans': model_package['kmeans_model'],
                'dbscan': model_package['dbscan_model'],
                'scaler': model_package['scaler'],
                'feature_columns': model_package['feature_info']['feature_columns'],
                'version': model_package.get('version', '1.0')
            }
            
        except Exception as e:
            logger.error(f"Error loading models for {api_key}: {str(e)}")
            return None
    
    def _prepare_feature_vector(self, features: Dict, feature_columns: List[str]) -> Optional[np.ndarray]:
        """Prepare feature vector for prediction"""
        try:
            feature_vector = []
            for col in feature_columns:
                value = features.get(col, 0)
                if isinstance(value, (int, float)):
                    feature_vector.append(value)
                else:
                    feature_vector.append(0)
            
            return np.array(feature_vector) if feature_vector else None
            
        except Exception as e:
            logger.error(f"Error preparing feature vector: {str(e)}")
            return None
    
    def _calculate_outlier_score(self, feature_vector: np.ndarray, models: Dict) -> float:
        """Calculate outlier score for a feature vector"""
        try:
            # Distance to nearest cluster center
            distances = models['kmeans'].transform([feature_vector])[0]
            min_distance = np.min(distances)
            
            # Normalize to 0-1 scale (higher = more outlier-like)
            max_distance = np.max(models['kmeans'].transform(models['scaler'].transform(
                np.random.randn(100, len(feature_vector))
            )))
            
            outlier_score = min(min_distance / max_distance, 1.0) if max_distance > 0 else 0.5
            
            return outlier_score
            
        except Exception as e:
            logger.error(f"Error calculating outlier score: {str(e)}")
            return 0.5
    
    def _load_cluster_data(self, api_key: str, cluster_id: str = None) -> List[Dict]:
        """Load cluster data from DynamoDB"""
        try:
            # This would query for cluster insights stored during training
            # For now, return empty list
            return []
            
        except Exception as e:
            logger.error(f"Error loading cluster data: {str(e)}")
            return []
    
    def _store_training_results(self, api_key: str, results: Dict):
        """Store training results in DynamoDB"""
        try:
            pk = f"{api_key}#training_results"
            sk = f"{datetime.utcnow().isoformat()}"
            
            # Calculate TTL (30 days)
            ttl = int((datetime.utcnow() + timedelta(days=30)).timestamp())
            
            self.clusters_table.put_item(
                Item={
                    'pk': pk,
                    'sk': sk,
                    'gsi1pk': api_key,
                    'gsi1sk': datetime.utcnow().isoformat(),
                    'ttl': ttl,
                    'training_results': results,
                    'result_type': 'training_summary'
                }
            )
            
            # Update last training time
            self.last_update_time[api_key] = datetime.utcnow()
            
        except Exception as e:
            logger.error(f"Error storing training results: {str(e)}")

# Example usage
if __name__ == "__main__":
    # Initialize service
    service = ClusteringService(
        feature_store_table_name='anon-intent-sdk-feature-store-production',
        clusters_table_name='anon-intent-sdk-intent-clusters-production',
        s3_bucket_name='anon-intent-sdk-ml-models-production'
    )
    
    # Train clusters for an API key
    result = service.train_clusters('demo-api-key-12345', force_retrain=True)
    print(json.dumps(result, indent=2, default=str))
    
    # Predict cluster for a new user
    sample_features = {
        'click_frequency': 15,
        'scroll_engagement': 0.7,
        'session_count': 3,
        'engagement_score': 0.8,
        'purchase_intent_score': 0.3
    }
    
    prediction = service.predict_cluster(
        'demo-api-key-12345',
        'anon-new-user',
        sample_features
    )
    print(json.dumps(prediction, indent=2))