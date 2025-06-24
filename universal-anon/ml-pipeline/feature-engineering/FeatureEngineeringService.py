"""
OnCabaret Anonymous Intent SDK - Feature Engineering Service
Extracts behavioral patterns, session analysis, and temporal pattern recognition
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import boto3
from boto3.dynamodb.conditions import Key, Attr
import json
import logging
from dataclasses import dataclass
from sklearn.preprocessing import StandardScaler, LabelEncoder
from collections import defaultdict
import math

logger = logging.getLogger(__name__)

@dataclass
class FeatureConfig:
    """Configuration for feature engineering"""
    time_windows: List[str] = None
    behavioral_patterns: List[str] = None
    session_features: List[str] = None
    temporal_features: List[str] = None
    
    def __post_init__(self):
        if self.time_windows is None:
            self.time_windows = ['1h', '6h', '24h', '7d', '30d']
        if self.behavioral_patterns is None:
            self.behavioral_patterns = [
                'click_velocity', 'scroll_depth', 'hover_duration',
                'form_abandonment', 'search_refinement', 'content_engagement'
            ]
        if self.session_features is None:
            self.session_features = [
                'session_duration', 'page_views', 'bounce_rate', 
                'conversion_funnel', 'exit_intent'
            ]
        if self.temporal_features is None:
            self.temporal_features = [
                'time_of_day', 'day_of_week', 'seasonality', 
                'recency', 'frequency'
            ]

class FeatureEngineeringService:
    """
    Service for extracting features from anonymous intent events
    Focuses on behavioral patterns without collecting PII
    """
    
    def __init__(self, 
                 events_table_name: str,
                 sessions_table_name: str,
                 feature_store_table_name: str,
                 config: FeatureConfig = None):
        self.events_table_name = events_table_name
        self.sessions_table_name = sessions_table_name
        self.feature_store_table_name = feature_store_table_name
        self.config = config or FeatureConfig()
        
        # Initialize AWS clients
        self.dynamodb = boto3.resource('dynamodb')
        self.events_table = self.dynamodb.Table(events_table_name)
        self.sessions_table = self.dynamodb.Table(sessions_table_name)
        self.feature_store_table = self.dynamodb.Table(feature_store_table_name)
        
        # Initialize scalers and encoders
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        
    def extract_features(self, api_key: str, anon_id: str, time_window: str = '7d') -> Dict:
        """
        Extract comprehensive features for a user
        
        Args:
            api_key: Customer API key
            anon_id: Anonymous user ID
            time_window: Time window for feature extraction
            
        Returns:
            Dictionary of extracted features
        """
        try:
            # Get events and sessions for the user
            events = self._get_user_events(api_key, anon_id, time_window)
            sessions = self._get_user_sessions(api_key, anon_id, time_window)
            
            if not events:
                logger.warning(f"No events found for user {anon_id}")
                return {}
            
            # Extract different categories of features
            behavioral_features = self._extract_behavioral_features(events)
            session_features = self._extract_session_features(sessions, events)
            temporal_features = self._extract_temporal_features(events)
            engagement_features = self._extract_engagement_features(events)
            intent_features = self._extract_intent_features(events)
            
            # Combine all features
            features = {
                'anon_id': anon_id,
                'api_key': api_key,
                'extraction_time': datetime.utcnow().isoformat(),
                'time_window': time_window,
                'event_count': len(events),
                **behavioral_features,
                **session_features,
                **temporal_features,
                **engagement_features,
                **intent_features
            }
            
            # Store features in feature store
            self._store_features(api_key, anon_id, features)
            
            return features
            
        except Exception as e:
            logger.error(f"Error extracting features for {anon_id}: {str(e)}")
            return {}
    
    def _get_user_events(self, api_key: str, anon_id: str, time_window: str) -> List[Dict]:
        """Get events for a user within time window"""
        try:
            # Calculate time range
            end_time = datetime.utcnow()
            start_time = self._get_time_window_start(end_time, time_window)
            
            # Query events table
            pk = f"{api_key}#{anon_id}"
            
            response = self.events_table.query(
                KeyConditionExpression=Key('pk').eq(pk) & 
                                     Key('sk').between(
                                         start_time.isoformat(),
                                         end_time.isoformat()
                                     ),
                ScanIndexForward=True  # Sort by timestamp ascending
            )
            
            return response.get('Items', [])
            
        except Exception as e:
            logger.error(f"Error getting events for {anon_id}: {str(e)}")
            return []
    
    def _get_user_sessions(self, api_key: str, anon_id: str, time_window: str) -> List[Dict]:
        """Get sessions for a user within time window"""
        try:
            pk = f"{api_key}#{anon_id}"
            
            response = self.sessions_table.query(
                KeyConditionExpression=Key('pk').eq(pk),
                ScanIndexForward=False  # Most recent first
            )
            
            return response.get('Items', [])
            
        except Exception as e:
            logger.error(f"Error getting sessions for {anon_id}: {str(e)}")
            return []
    
    def _extract_behavioral_features(self, events: List[Dict]) -> Dict:
        """Extract behavioral pattern features"""
        features = {}
        
        if not events:
            return features
        
        # Event type distribution
        event_types = [e.get('eventName', 'unknown') for e in events]
        event_type_counts = pd.Series(event_types).value_counts()
        
        # Basic behavioral metrics
        features.update({
            'unique_event_types': len(event_type_counts),
            'most_common_event': event_type_counts.index[0] if len(event_type_counts) > 0 else 'none',
            'event_diversity': self._calculate_entropy(event_type_counts.values),
        })
        
        # Specific event patterns
        features.update(self._extract_click_patterns(events))
        features.update(self._extract_scroll_patterns(events))
        features.update(self._extract_search_patterns(events))
        features.update(self._extract_form_patterns(events))
        
        return features
    
    def _extract_click_patterns(self, events: List[Dict]) -> Dict:
        """Extract click behavior patterns"""
        click_events = [e for e in events if 'click' in e.get('eventName', '').lower() 
                       or e.get('eventName') == 'tap_to_save']
        
        if not click_events:
            return {
                'click_frequency': 0,
                'click_velocity': 0,
                'click_burst_score': 0
            }
        
        # Sort by timestamp
        click_events.sort(key=lambda x: x.get('timestamp', ''))
        
        # Calculate click intervals
        intervals = []
        for i in range(1, len(click_events)):
            try:
                t1 = datetime.fromisoformat(click_events[i-1]['timestamp'].replace('Z', '+00:00'))
                t2 = datetime.fromisoformat(click_events[i]['timestamp'].replace('Z', '+00:00'))
                interval = (t2 - t1).total_seconds()
                intervals.append(interval)
            except:
                continue
        
        if not intervals:
            return {
                'click_frequency': len(click_events),
                'click_velocity': 0,
                'click_burst_score': 0
            }
        
        # Calculate velocity metrics
        avg_interval = np.mean(intervals)
        velocity = 1 / avg_interval if avg_interval > 0 else 0
        
        # Burst detection (rapid clicking)
        burst_threshold = 2.0  # seconds
        burst_clicks = sum(1 for interval in intervals if interval < burst_threshold)
        burst_score = burst_clicks / len(intervals) if intervals else 0
        
        return {
            'click_frequency': len(click_events),
            'click_velocity': velocity,
            'click_burst_score': burst_score,
            'avg_click_interval': avg_interval
        }
    
    def _extract_scroll_patterns(self, events: List[Dict]) -> Dict:
        """Extract scroll behavior patterns"""
        scroll_events = [e for e in events if 'scroll' in e.get('eventName', '').lower()]
        
        if not scroll_events:
            return {
                'scroll_frequency': 0,
                'avg_scroll_depth': 0,
                'scroll_engagement': 0
            }
        
        # Extract scroll depths from properties
        scroll_depths = []
        for event in scroll_events:
            properties = event.get('properties', {})
            if isinstance(properties, dict):
                depth = properties.get('scroll_depth', properties.get('scrollDepth', 0))
                if isinstance(depth, (int, float)):
                    scroll_depths.append(depth)
        
        avg_depth = np.mean(scroll_depths) if scroll_depths else 0
        max_depth = max(scroll_depths) if scroll_depths else 0
        
        # Engagement score based on scroll behavior
        engagement_score = min(max_depth / 100.0, 1.0)  # Normalize to 0-1
        
        return {
            'scroll_frequency': len(scroll_events),
            'avg_scroll_depth': avg_depth,
            'max_scroll_depth': max_depth,
            'scroll_engagement': engagement_score
        }
    
    def _extract_search_patterns(self, events: List[Dict]) -> Dict:
        """Extract search behavior patterns"""
        search_events = [e for e in events if e.get('eventName') == 'search']
        
        if not search_events:
            return {
                'search_frequency': 0,
                'search_refinement_rate': 0,
                'avg_search_terms': 0
            }
        
        # Extract search queries
        search_queries = []
        for event in search_events:
            properties = event.get('properties', {})
            if isinstance(properties, dict):
                query = properties.get('search_query', properties.get('query', ''))
                if query:
                    search_queries.append(query.lower().strip())
        
        # Calculate refinement rate (similar queries)
        refinement_count = 0
        for i in range(1, len(search_queries)):
            if self._queries_similar(search_queries[i-1], search_queries[i]):
                refinement_count += 1
        
        refinement_rate = refinement_count / len(search_queries) if search_queries else 0
        
        # Average search term length
        avg_terms = np.mean([len(q.split()) for q in search_queries]) if search_queries else 0
        
        return {
            'search_frequency': len(search_events),
            'search_refinement_rate': refinement_rate,
            'avg_search_terms': avg_terms,
            'unique_search_queries': len(set(search_queries))
        }
    
    def _extract_form_patterns(self, events: List[Dict]) -> Dict:
        """Extract form interaction patterns"""
        form_starts = [e for e in events if e.get('eventName') == 'form_start']
        form_completes = [e for e in events if e.get('eventName') == 'form_complete']
        form_abandons = [e for e in events if e.get('eventName') == 'form_abandon']
        
        total_forms = len(form_starts)
        completed_forms = len(form_completes)
        abandoned_forms = len(form_abandons)
        
        completion_rate = completed_forms / total_forms if total_forms > 0 else 0
        abandonment_rate = abandoned_forms / total_forms if total_forms > 0 else 0
        
        return {
            'form_starts': total_forms,
            'form_completion_rate': completion_rate,
            'form_abandonment_rate': abandonment_rate
        }
    
    def _extract_session_features(self, sessions: List[Dict], events: List[Dict]) -> Dict:
        """Extract session-based features"""
        if not sessions and not events:
            return {
                'avg_session_duration': 0,
                'session_count': 0,
                'avg_events_per_session': 0,
                'bounce_rate': 0
            }
        
        # Calculate session durations
        session_durations = []
        events_per_session = defaultdict(int)
        
        # Group events by session
        for event in events:
            session_id = event.get('sessionId', 'unknown')
            events_per_session[session_id] += 1
        
        # Calculate session metrics from actual sessions
        for session in sessions:
            duration = session.get('gsi1sk', 0)  # Session duration in GSI
            if isinstance(duration, (int, float)) and duration > 0:
                session_durations.append(duration)
        
        # If no session durations, estimate from events
        if not session_durations and events:
            session_events = defaultdict(list)
            for event in events:
                session_id = event.get('sessionId', 'unknown')
                timestamp = event.get('timestamp', '')
                session_events[session_id].append(timestamp)
            
            for session_id, timestamps in session_events.items():
                if len(timestamps) > 1:
                    timestamps.sort()
                    try:
                        start = datetime.fromisoformat(timestamps[0].replace('Z', '+00:00'))
                        end = datetime.fromisoformat(timestamps[-1].replace('Z', '+00:00'))
                        duration = (end - start).total_seconds()
                        session_durations.append(duration)
                    except:
                        continue
        
        # Calculate bounce rate (sessions with only 1 event)
        single_event_sessions = sum(1 for count in events_per_session.values() if count == 1)
        bounce_rate = single_event_sessions / len(events_per_session) if events_per_session else 0
        
        return {
            'avg_session_duration': np.mean(session_durations) if session_durations else 0,
            'max_session_duration': max(session_durations) if session_durations else 0,
            'session_count': len(set(events_per_session.keys())),
            'avg_events_per_session': np.mean(list(events_per_session.values())) if events_per_session else 0,
            'bounce_rate': bounce_rate
        }
    
    def _extract_temporal_features(self, events: List[Dict]) -> Dict:
        """Extract temporal pattern features"""
        if not events:
            return {
                'time_spread': 0,
                'peak_hour': 0,
                'weekend_ratio': 0,
                'activity_rhythm_score': 0
            }
        
        # Extract timestamps
        timestamps = []
        for event in events:
            try:
                ts = datetime.fromisoformat(event['timestamp'].replace('Z', '+00:00'))
                timestamps.append(ts)
            except:
                continue
        
        if not timestamps:
            return {
                'time_spread': 0,
                'peak_hour': 0,
                'weekend_ratio': 0,
                'activity_rhythm_score': 0
            }
        
        # Time spread
        timestamps.sort()
        time_spread = (timestamps[-1] - timestamps[0]).total_seconds() / 3600  # hours
        
        # Hour distribution
        hours = [ts.hour for ts in timestamps]
        hour_counts = pd.Series(hours).value_counts()
        peak_hour = hour_counts.index[0] if len(hour_counts) > 0 else 0
        
        # Weekend activity
        weekend_events = sum(1 for ts in timestamps if ts.weekday() >= 5)
        weekend_ratio = weekend_events / len(timestamps)
        
        # Activity rhythm (consistency of timing)
        if len(hours) > 1:
            rhythm_score = 1 - (np.std(hours) / 12)  # Normalized std dev
        else:
            rhythm_score = 0
        
        return {
            'time_spread': time_spread,
            'peak_hour': peak_hour,
            'weekend_ratio': weekend_ratio,
            'activity_rhythm_score': max(0, rhythm_score)
        }
    
    def _extract_engagement_features(self, events: List[Dict]) -> Dict:
        """Extract engagement and interaction features"""
        if not events:
            return {
                'engagement_score': 0,
                'content_interaction_rate': 0,
                'save_rate': 0,
                'share_rate': 0
            }
        
        total_events = len(events)
        
        # Count engagement events
        content_views = sum(1 for e in events if e.get('eventName') == 'content_view')
        content_saves = sum(1 for e in events if e.get('eventName') == 'content_save')
        content_shares = sum(1 for e in events if e.get('eventName') == 'content_share')
        tap_saves = sum(1 for e in events if e.get('eventName') == 'tap_to_save')
        
        # Calculate rates
        content_interaction_rate = (content_views + content_saves + content_shares) / total_events
        save_rate = (content_saves + tap_saves) / total_events
        share_rate = content_shares / total_events
        
        # Overall engagement score
        engagement_score = min(content_interaction_rate + save_rate * 2 + share_rate * 3, 1.0)
        
        return {
            'engagement_score': engagement_score,
            'content_interaction_rate': content_interaction_rate,
            'save_rate': save_rate,
            'share_rate': share_rate
        }
    
    def _extract_intent_features(self, events: List[Dict]) -> Dict:
        """Extract intent-related features"""
        if not events:
            return {
                'purchase_intent_score': 0,
                'browse_intent_score': 0,
                'compare_intent_score': 0,
                'exit_intent_score': 0
            }
        
        total_events = len(events)
        
        # Count intent signals
        purchase_signals = sum(1 for e in events if e.get('eventName') == 'purchase_intent')
        browse_signals = sum(1 for e in events if e.get('eventName') == 'browse_intent')
        compare_signals = sum(1 for e in events if e.get('eventName') == 'compare_intent')
        exit_signals = sum(1 for e in events if e.get('eventName') == 'exit_intent')
        
        # Calculate intent scores
        purchase_score = purchase_signals / total_events
        browse_score = browse_signals / total_events
        compare_score = compare_signals / total_events
        exit_score = exit_signals / total_events
        
        return {
            'purchase_intent_score': purchase_score,
            'browse_intent_score': browse_score,
            'compare_intent_score': compare_score,
            'exit_intent_score': exit_score
        }
    
    def _store_features(self, api_key: str, anon_id: str, features: Dict):
        """Store extracted features in DynamoDB"""
        try:
            pk = f"{api_key}#{anon_id}"
            sk = f"features#{datetime.utcnow().isoformat()}"
            
            # Calculate TTL (30 days)
            ttl = int((datetime.utcnow() + timedelta(days=30)).timestamp())
            
            # Prepare GSI keys
            gsi1pk = f"{api_key}#features"
            gsi1sk = datetime.utcnow().isoformat()
            
            self.feature_store_table.put_item(
                Item={
                    'pk': pk,
                    'sk': sk,
                    'gsi1pk': gsi1pk,
                    'gsi1sk': gsi1sk,
                    'ttl': ttl,
                    'features': features,
                    'feature_version': '1.0',
                    'extraction_timestamp': datetime.utcnow().isoformat()
                }
            )
            
        except Exception as e:
            logger.error(f"Error storing features: {str(e)}")
    
    # Utility methods
    def _get_time_window_start(self, end_time: datetime, window: str) -> datetime:
        """Calculate start time for time window"""
        if window == '1h':
            return end_time - timedelta(hours=1)
        elif window == '6h':
            return end_time - timedelta(hours=6)
        elif window == '24h':
            return end_time - timedelta(hours=24)
        elif window == '7d':
            return end_time - timedelta(days=7)
        elif window == '30d':
            return end_time - timedelta(days=30)
        else:
            return end_time - timedelta(hours=24)  # Default to 24h
    
    def _calculate_entropy(self, values) -> float:
        """Calculate Shannon entropy"""
        if not values or len(values) == 0:
            return 0
        
        total = sum(values)
        if total == 0:
            return 0
        
        probabilities = [v / total for v in values]
        entropy = -sum(p * math.log2(p) for p in probabilities if p > 0)
        return entropy
    
    def _queries_similar(self, q1: str, q2: str, threshold: float = 0.7) -> bool:
        """Check if two search queries are similar (simple word overlap)"""
        words1 = set(q1.split())
        words2 = set(q2.split())
        
        if not words1 or not words2:
            return False
        
        intersection = len(words1.intersection(words2))
        union = len(words1.union(words2))
        
        similarity = intersection / union if union > 0 else 0
        return similarity >= threshold

# Example usage
if __name__ == "__main__":
    # Initialize service
    service = FeatureEngineeringService(
        events_table_name='anon-intent-sdk-events-production',
        sessions_table_name='anon-intent-sdk-sessions-production',
        feature_store_table_name='anon-intent-sdk-feature-store-production'
    )
    
    # Extract features for a user
    features = service.extract_features(
        api_key='demo-api-key-12345',
        anon_id='anon-user-example',
        time_window='7d'
    )
    
    print(json.dumps(features, indent=2))