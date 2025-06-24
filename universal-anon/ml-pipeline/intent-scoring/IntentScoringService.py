"""
OnCabaret Anonymous Intent SDK - Intent Scoring Service
LightGBM training pipeline with feature importance analysis and model versioning
"""

import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
import boto3
from boto3.dynamodb.conditions import Key
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any, Union
import pickle
import joblib
from dataclasses import dataclass
import uuid
import shap
import matplotlib.pyplot as plt
import seaborn as sns
from io import BytesIO
import base64

logger = logging.getLogger(__name__)

@dataclass
class IntentScoringConfig:
    """Configuration for intent scoring models"""
    target_intents: List[str] = None
    lgb_params: Dict = None
    validation_split: float = 0.2
    cv_folds: int = 5
    early_stopping_rounds: int = 50
    feature_importance_threshold: float = 0.01
    model_version_retention: int = 5
    min_samples_per_intent: int = 100
    scoring_threshold: float = 0.5
    
    def __post_init__(self):
        if self.target_intents is None:
            self.target_intents = [
                'purchase_intent', 'browse_intent', 'compare_intent', 
                'exit_intent', 'engagement_intent'
            ]
        if self.lgb_params is None:
            self.lgb_params = {
                'objective': 'binary',
                'metric': 'binary_logloss',
                'boosting_type': 'gbdt',
                'num_leaves': 31,
                'learning_rate': 0.05,
                'feature_fraction': 0.9,
                'bagging_fraction': 0.8,
                'bagging_freq': 5,
                'verbose': -1,
                'random_state': 42
            }

class IntentScoringService:
    """
    Service for training and deploying intent scoring models
    Uses LightGBM for efficient gradient boosting with feature importance
    """
    
    def __init__(self,
                 feature_store_table_name: str,
                 events_table_name: str,
                 sessions_table_name: str,
                 s3_bucket_name: str,
                 config: IntentScoringConfig = None):
        self.feature_store_table_name = feature_store_table_name
        self.events_table_name = events_table_name
        self.sessions_table_name = sessions_table_name
        self.s3_bucket_name = s3_bucket_name
        self.config = config or IntentScoringConfig()
        
        # Initialize AWS clients
        self.dynamodb = boto3.resource('dynamodb')
        self.s3_client = boto3.client('s3')
        self.feature_store_table = self.dynamodb.Table(feature_store_table_name)
        self.events_table = self.dynamodb.Table(events_table_name)
        self.sessions_table = self.dynamodb.Table(sessions_table_name)
        
        # Initialize ML components
        self.models = {}
        self.feature_encoders = {}
        self.scalers = {}
        self.feature_importance = {}
        
    def train_intent_models(self, api_key: str, force_retrain: bool = False) -> Dict[str, Any]:
        """
        Train intent scoring models for a specific API key
        
        Args:
            api_key: Customer API key
            force_retrain: Force retraining even if recent model exists
            
        Returns:
            Dictionary with training results and model performance
        """
        try:
            # Check if we need to retrain
            if not force_retrain and self._should_skip_training(api_key):
                logger.info(f"Skipping training for {api_key} - recent model exists")
                return {'status': 'skipped', 'reason': 'recent_model_exists'}
            
            # Load training data
            training_data = self._prepare_training_data(api_key)
            
            if len(training_data) < self.config.min_samples_per_intent:
                logger.warning(f"Insufficient training data: {len(training_data)} samples")
                return {'status': 'failed', 'reason': 'insufficient_data', 'samples': len(training_data)}
            
            results = {}
            model_versions = {}
            
            # Train models for each intent type
            for intent_type in self.config.target_intents:
                logger.info(f"Training model for {intent_type}")
                
                model_result = self._train_single_intent_model(
                    api_key, intent_type, training_data
                )
                
                if model_result['status'] == 'success':
                    results[intent_type] = model_result
                    
                    # Store model
                    model_info = self._store_intent_model(
                        api_key, intent_type, model_result
                    )
                    model_versions[intent_type] = model_info
                else:
                    logger.warning(f"Failed to train {intent_type}: {model_result.get('error', 'Unknown error')}")
                    results[intent_type] = model_result
            
            # Generate ensemble model if multiple intents trained successfully
            if len([r for r in results.values() if r['status'] == 'success']) > 1:
                ensemble_result = self._train_ensemble_model(api_key, results, training_data)
                results['ensemble'] = ensemble_result
            
            # Store training summary
            training_summary = {
                'status': 'success',
                'api_key': api_key,
                'training_time': datetime.utcnow().isoformat(),
                'total_samples': len(training_data),
                'intent_models': results,
                'model_versions': model_versions,
                'config': self.config.__dict__
            }
            
            self._store_training_summary(api_key, training_summary)
            
            return training_summary
            
        except Exception as e:
            logger.error(f"Error training intent models for {api_key}: {str(e)}")
            return {'status': 'error', 'error': str(e)}
    
    def predict_intent_scores(self, api_key: str, anon_id: str, features: Dict) -> Dict[str, Any]:
        """
        Predict intent scores for a user
        
        Args:
            api_key: Customer API key
            anon_id: Anonymous user ID
            features: User features dictionary
            
        Returns:
            Intent scores and predictions
        """
        try:
            # Load models for this API key
            models = self._load_intent_models(api_key)
            if not models:
                logger.warning(f"No intent models found for {api_key}")
                return self._generate_default_scores(anon_id)
            
            # Prepare features for prediction
            feature_vector = self._prepare_feature_vector(features, models)
            
            if feature_vector is None:
                return self._generate_default_scores(anon_id)
            
            # Generate predictions for each intent
            intent_scores = {}
            intent_probabilities = {}
            
            for intent_type in self.config.target_intents:
                if intent_type in models:
                    model = models[intent_type]['model']
                    scaler = models[intent_type].get('scaler')
                    
                    # Scale features if scaler exists
                    if scaler:
                        scaled_features = scaler.transform([feature_vector])
                    else:
                        scaled_features = [feature_vector]
                    
                    # Predict probability
                    probability = model.predict(scaled_features, num_iteration=model.best_iteration)[0]
                    
                    # Convert to score (0-1)
                    score = self._sigmoid(probability)
                    
                    intent_scores[intent_type] = float(score)
                    intent_probabilities[intent_type] = float(probability)
                else:
                    # Default score if no model
                    intent_scores[intent_type] = 0.5
                    intent_probabilities[intent_type] = 0.0
            
            # Calculate ensemble score if available
            ensemble_score = self._calculate_ensemble_score(intent_scores, models)
            
            # Generate prediction result
            prediction_result = {
                'anon_id': anon_id,
                'api_key': api_key,
                'intent_scores': intent_scores,
                'intent_probabilities': intent_probabilities,
                'ensemble_score': ensemble_score,
                'primary_intent': max(intent_scores.items(), key=lambda x: x[1])[0],
                'confidence': max(intent_scores.values()),
                'prediction_time': datetime.utcnow().isoformat(),
                'model_versions': {intent: models[intent].get('version', '1.0') 
                                 for intent in models.keys() if intent in self.config.target_intents}
            }
            
            # Store prediction for future training
            self._store_prediction_result(api_key, anon_id, prediction_result)
            
            return prediction_result
            
        except Exception as e:
            logger.error(f"Error predicting intent scores for {anon_id}: {str(e)}")
            return self._generate_default_scores(anon_id)
    
    def get_feature_importance(self, api_key: str, intent_type: str = None) -> Dict[str, Any]:
        """
        Get feature importance analysis for intent models
        
        Args:
            api_key: Customer API key
            intent_type: Specific intent type (optional)
            
        Returns:
            Feature importance analysis
        """
        try:
            models = self._load_intent_models(api_key)
            if not models:
                return {'status': 'no_models', 'importance': {}}
            
            importance_analysis = {}
            
            # Analyze specific intent or all intents
            intents_to_analyze = [intent_type] if intent_type else list(models.keys())
            
            for intent in intents_to_analyze:
                if intent in models and intent in self.config.target_intents:
                    model_info = models[intent]
                    model = model_info['model']
                    feature_names = model_info.get('feature_names', [])
                    
                    # Get LightGBM feature importance
                    importance_gain = model.feature_importance(importance_type='gain')
                    importance_split = model.feature_importance(importance_type='split')
                    
                    # Create feature importance dataframe
                    importance_df = pd.DataFrame({
                        'feature': feature_names,
                        'importance_gain': importance_gain,
                        'importance_split': importance_split
                    })
                    importance_df = importance_df.sort_values('importance_gain', ascending=False)
                    
                    # Generate SHAP values if model supports it
                    shap_values = self._calculate_shap_values(model, model_info)
                    
                    importance_analysis[intent] = {
                        'feature_importance': importance_df.to_dict('records'),
                        'top_features': importance_df.head(10)['feature'].tolist(),
                        'shap_summary': shap_values,
                        'model_version': model_info.get('version', '1.0'),
                        'analysis_time': datetime.utcnow().isoformat()
                    }
            
            return {
                'status': 'success',
                'api_key': api_key,
                'importance_analysis': importance_analysis,
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting feature importance for {api_key}: {str(e)}")
            return {'status': 'error', 'error': str(e)}
    
    def update_model_feedback(self, api_key: str, anon_id: str, 
                             intent_type: str, actual_outcome: bool) -> Dict[str, Any]:
        """
        Update model with feedback for continuous learning
        
        Args:
            api_key: Customer API key
            anon_id: Anonymous user ID
            intent_type: Intent type that was predicted
            actual_outcome: Whether the intent actually occurred
            
        Returns:
            Feedback processing result
        """
        try:
            # Store feedback for future retraining
            feedback_record = {
                'api_key': api_key,
                'anon_id': anon_id,
                'intent_type': intent_type,
                'actual_outcome': actual_outcome,
                'feedback_time': datetime.utcnow().isoformat(),
                'feedback_id': str(uuid.uuid4())
            }
            
            self._store_model_feedback(api_key, feedback_record)
            
            # Check if we have enough feedback to trigger retraining
            feedback_count = self._count_recent_feedback(api_key, intent_type)
            
            retrain_triggered = False
            if feedback_count >= 100:  # Threshold for retraining
                # Trigger model retraining
                logger.info(f"Triggering retraining for {api_key}/{intent_type} based on feedback")
                retrain_triggered = True
                # Would trigger async retraining here
            
            return {
                'status': 'success',
                'feedback_recorded': True,
                'feedback_count': feedback_count,
                'retrain_triggered': retrain_triggered
            }
            
        except Exception as e:
            logger.error(f"Error updating model feedback: {str(e)}")
            return {'status': 'error', 'error': str(e)}
    
    def _prepare_training_data(self, api_key: str) -> pd.DataFrame:
        """Prepare training data by combining features and intent labels"""
        try:
            # Load features
            features_df = self._load_training_features(api_key)
            
            # Load intent labels from events
            intent_labels = self._extract_intent_labels(api_key)
            
            if features_df.empty or intent_labels.empty:
                return pd.DataFrame()
            
            # Merge features with labels
            training_data = features_df.merge(
                intent_labels, 
                on=['api_key', 'anon_id'], 
                how='inner'
            )
            
            # Clean and validate data
            training_data = self._clean_training_data(training_data)
            
            return training_data
            
        except Exception as e:
            logger.error(f"Error preparing training data: {str(e)}")
            return pd.DataFrame()
    
    def _load_training_features(self, api_key: str, limit: int = 50000) -> pd.DataFrame:
        """Load features for training"""
        try:
            gsi1pk = f"{api_key}#features"
            
            response = self.feature_store_table.query(
                IndexName='GSI1-FeaturesByType',
                KeyConditionExpression=Key('gsi1pk').eq(gsi1pk),
                ScanIndexForward=False,
                Limit=limit
            )
            
            items = response.get('Items', [])
            
            if not items:
                return pd.DataFrame()
            
            # Extract features
            features_list = []
            for item in items:
                features = item.get('features', {})
                if isinstance(features, dict) and features:
                    features_list.append(features)
            
            return pd.DataFrame(features_list)
            
        except Exception as e:
            logger.error(f"Error loading training features: {str(e)}")
            return pd.DataFrame()
    
    def _extract_intent_labels(self, api_key: str) -> pd.DataFrame:
        """Extract intent labels from events data"""
        try:
            # Query events to find intent-related events
            # This is a simplified version - in practice would use GSI queries
            
            # For demo, generate synthetic labels based on event patterns
            synthetic_labels = []
            
            # Would normally query events table for actual intent events
            # For now, create sample data
            for i in range(1000):
                anon_id = f"anon-user-{i}"
                
                # Generate synthetic intent labels
                labels = {
                    'api_key': api_key,
                    'anon_id': anon_id,
                    'purchase_intent': np.random.random() > 0.7,
                    'browse_intent': np.random.random() > 0.3,
                    'compare_intent': np.random.random() > 0.6,
                    'exit_intent': np.random.random() > 0.8,
                    'engagement_intent': np.random.random() > 0.4
                }
                
                synthetic_labels.append(labels)
            
            return pd.DataFrame(synthetic_labels)
            
        except Exception as e:
            logger.error(f"Error extracting intent labels: {str(e)}")
            return pd.DataFrame()
    
    def _clean_training_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean and validate training data"""
        # Remove rows with missing critical data
        df = df.dropna(subset=['anon_id', 'api_key'])
        
        # Handle missing values in features
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        df[numeric_cols] = df[numeric_cols].fillna(0)
        
        # Remove duplicate anon_ids (keep most recent)
        df = df.drop_duplicates(subset=['anon_id'], keep='last')
        
        return df
    
    def _train_single_intent_model(self, api_key: str, intent_type: str, 
                                 training_data: pd.DataFrame) -> Dict[str, Any]:
        """Train a single intent prediction model"""
        try:
            # Check if we have the target column
            if intent_type not in training_data.columns:
                return {'status': 'failed', 'error': f'No target data for {intent_type}'}
            
            # Prepare features and target
            feature_cols = self._get_feature_columns(training_data)
            X = training_data[feature_cols].fillna(0)
            y = training_data[intent_type].astype(int)
            
            # Check class balance
            positive_samples = y.sum()
            if positive_samples < self.config.min_samples_per_intent:
                return {
                    'status': 'failed', 
                    'error': f'Insufficient positive samples: {positive_samples}'
                }
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=self.config.validation_split, 
                random_state=42, stratify=y
            )
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Prepare LightGBM datasets
            train_data = lgb.Dataset(X_train_scaled, label=y_train)
            valid_data = lgb.Dataset(X_test_scaled, label=y_test, reference=train_data)
            
            # Train model
            model = lgb.train(
                self.config.lgb_params,
                train_data,
                valid_sets=[valid_data],
                callbacks=[lgb.early_stopping(self.config.early_stopping_rounds)],
                num_boost_round=1000
            )
            
            # Evaluate model
            y_pred_proba = model.predict(X_test_scaled, num_iteration=model.best_iteration)
            y_pred = (y_pred_proba > self.config.scoring_threshold).astype(int)
            
            # Calculate metrics
            metrics = {
                'accuracy': accuracy_score(y_test, y_pred),
                'precision': precision_score(y_test, y_pred, zero_division=0),
                'recall': recall_score(y_test, y_pred, zero_division=0),
                'f1_score': f1_score(y_test, y_pred, zero_division=0),
                'roc_auc': roc_auc_score(y_test, y_pred_proba) if len(set(y_test)) > 1 else 0.5
            }
            
            # Cross-validation
            cv_scores = self._perform_cross_validation(X, y, feature_cols)
            
            return {
                'status': 'success',
                'model': model,
                'scaler': scaler,
                'feature_names': feature_cols,
                'metrics': metrics,
                'cv_scores': cv_scores,
                'training_samples': len(X_train),
                'positive_samples': int(positive_samples),
                'best_iteration': model.best_iteration
            }
            
        except Exception as e:
            logger.error(f"Error training model for {intent_type}: {str(e)}")
            return {'status': 'error', 'error': str(e)}
    
    def _train_ensemble_model(self, api_key: str, intent_results: Dict, 
                            training_data: pd.DataFrame) -> Dict[str, Any]:
        """Train ensemble model combining multiple intent predictions"""
        try:
            # Collect predictions from individual models
            ensemble_features = []
            ensemble_target = []
            
            feature_cols = self._get_feature_columns(training_data)
            X = training_data[feature_cols].fillna(0)
            
            # Generate predictions from each intent model
            intent_predictions = {}
            for intent_type, result in intent_results.items():
                if result['status'] == 'success':
                    model = result['model']
                    scaler = result['scaler']
                    
                    X_scaled = scaler.transform(X)
                    predictions = model.predict(X_scaled, num_iteration=model.best_iteration)
                    intent_predictions[intent_type] = predictions
            
            if len(intent_predictions) < 2:
                return {'status': 'failed', 'error': 'Need at least 2 intent models for ensemble'}
            
            # Create ensemble features (intent predictions + original features)
            ensemble_X = pd.DataFrame(intent_predictions)
            
            # Add top original features
            top_features = feature_cols[:10]  # Use top 10 features
            ensemble_X = pd.concat([ensemble_X, X[top_features]], axis=1)
            
            # Create ensemble target (any positive intent)
            ensemble_y = np.zeros(len(training_data))
            for intent_type in self.config.target_intents:
                if intent_type in training_data.columns:
                    ensemble_y = np.logical_or(ensemble_y, training_data[intent_type])
            
            ensemble_y = ensemble_y.astype(int)
            
            # Train ensemble model
            X_train, X_test, y_train, y_test = train_test_split(
                ensemble_X, ensemble_y, test_size=0.2, random_state=42, stratify=ensemble_y
            )
            
            train_data = lgb.Dataset(X_train, label=y_train)
            valid_data = lgb.Dataset(X_test, label=y_test, reference=train_data)
            
            ensemble_model = lgb.train(
                self.config.lgb_params,
                train_data,
                valid_sets=[valid_data],
                callbacks=[lgb.early_stopping(50)],
                num_boost_round=500
            )
            
            # Evaluate ensemble
            y_pred_proba = ensemble_model.predict(X_test, num_iteration=ensemble_model.best_iteration)
            y_pred = (y_pred_proba > 0.5).astype(int)
            
            ensemble_metrics = {
                'accuracy': accuracy_score(y_test, y_pred),
                'precision': precision_score(y_test, y_pred, zero_division=0),
                'recall': recall_score(y_test, y_pred, zero_division=0),
                'f1_score': f1_score(y_test, y_pred, zero_division=0),
                'roc_auc': roc_auc_score(y_test, y_pred_proba) if len(set(y_test)) > 1 else 0.5
            }
            
            return {
                'status': 'success',
                'model': ensemble_model,
                'feature_names': list(ensemble_X.columns),
                'metrics': ensemble_metrics,
                'training_samples': len(X_train),
                'component_models': list(intent_predictions.keys())
            }
            
        except Exception as e:
            logger.error(f"Error training ensemble model: {str(e)}")
            return {'status': 'error', 'error': str(e)}
    
    def _perform_cross_validation(self, X: pd.DataFrame, y: pd.Series, 
                                feature_cols: List[str]) -> Dict[str, float]:
        """Perform cross-validation for model evaluation"""
        try:
            # Use a simple model for CV to avoid complexity
            from sklearn.ensemble import RandomForestClassifier
            
            rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
            
            # Stratified K-Fold
            skf = StratifiedKFold(n_splits=self.config.cv_folds, shuffle=True, random_state=42)
            
            cv_scores = cross_val_score(rf_model, X, y, cv=skf, scoring='roc_auc')
            
            return {
                'mean_auc': float(np.mean(cv_scores)),
                'std_auc': float(np.std(cv_scores)),
                'scores': cv_scores.tolist()
            }
            
        except Exception as e:
            logger.warning(f"Error in cross-validation: {str(e)}")
            return {'mean_auc': 0.5, 'std_auc': 0.0, 'scores': []}
    
    def _get_feature_columns(self, df: pd.DataFrame) -> List[str]:
        """Get relevant feature columns for training"""
        # Exclude target columns and metadata
        exclude_cols = [
            'anon_id', 'api_key', 'extraction_time', 'time_window'
        ] + self.config.target_intents
        
        feature_cols = [col for col in df.columns 
                       if col not in exclude_cols and df[col].dtype in ['int64', 'float64']]
        
        return feature_cols
    
    def _store_intent_model(self, api_key: str, intent_type: str, 
                          model_result: Dict) -> Dict[str, Any]:
        """Store trained intent model in S3"""
        try:
            model_id = str(uuid.uuid4())
            model_key = f"intent_models/{api_key}/{intent_type}/{model_id}"
            
            # Prepare model package
            model_package = {
                'model': model_result['model'],
                'scaler': model_result.get('scaler'),
                'feature_names': model_result['feature_names'],
                'metrics': model_result['metrics'],
                'intent_type': intent_type,
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
                    'intent_type': intent_type,
                    'model_id': model_id,
                    'training_time': datetime.utcnow().isoformat(),
                    'accuracy': str(model_result['metrics']['accuracy']),
                    'f1_score': str(model_result['metrics']['f1_score'])
                }
            )
            
            return {
                'model_id': model_id,
                'model_key': model_key,
                'size_bytes': len(model_data),
                's3_location': f"s3://{self.s3_bucket_name}/{model_key}/model.pkl"
            }
            
        except Exception as e:
            logger.error(f"Error storing intent model: {str(e)}")
            return {}
    
    def _load_intent_models(self, api_key: str) -> Optional[Dict]:
        """Load latest intent models for an API key"""
        try:
            models = {}
            
            for intent_type in self.config.target_intents:
                # Find latest model for this intent
                model_key_prefix = f"intent_models/{api_key}/{intent_type}/"
                
                response = self.s3_client.list_objects_v2(
                    Bucket=self.s3_bucket_name,
                    Prefix=model_key_prefix
                )
                
                if 'Contents' not in response:
                    continue
                
                # Get most recent model
                model_objects = sorted(response['Contents'], 
                                     key=lambda x: x['LastModified'], reverse=True)
                
                if model_objects:
                    latest_model_key = model_objects[0]['Key']
                    
                    # Load model
                    model_response = self.s3_client.get_object(
                        Bucket=self.s3_bucket_name,
                        Key=latest_model_key
                    )
                    
                    model_package = pickle.loads(model_response['Body'].read())
                    models[intent_type] = model_package
            
            return models if models else None
            
        except Exception as e:
            logger.error(f"Error loading intent models for {api_key}: {str(e)}")
            return None
    
    def _prepare_feature_vector(self, features: Dict, models: Dict) -> Optional[np.ndarray]:
        """Prepare feature vector for prediction"""
        try:
            # Get feature names from any model
            feature_names = None
            for model_info in models.values():
                if 'feature_names' in model_info:
                    feature_names = model_info['feature_names']
                    break
            
            if not feature_names:
                return None
            
            # Prepare feature vector
            feature_vector = []
            for feature_name in feature_names:
                value = features.get(feature_name, 0)
                if isinstance(value, (int, float)):
                    feature_vector.append(value)
                else:
                    feature_vector.append(0)
            
            return np.array(feature_vector)
            
        except Exception as e:
            logger.error(f"Error preparing feature vector: {str(e)}")
            return None
    
    def _calculate_ensemble_score(self, intent_scores: Dict, models: Dict) -> float:
        """Calculate ensemble score from individual intent scores"""
        try:
            if 'ensemble' in models:
                # Use trained ensemble model
                ensemble_model = models['ensemble']['model']
                
                # Prepare ensemble input (intent scores + features would be needed)
                # For now, simple weighted average
                weights = {
                    'purchase_intent': 0.3,
                    'browse_intent': 0.2,
                    'compare_intent': 0.2,
                    'exit_intent': 0.1,
                    'engagement_intent': 0.2
                }
                
                weighted_score = sum(
                    intent_scores.get(intent, 0) * weights.get(intent, 0.1)
                    for intent in intent_scores.keys()
                )
                
                return min(weighted_score, 1.0)
            else:
                # Simple average
                return np.mean(list(intent_scores.values()))
                
        except Exception as e:
            logger.error(f"Error calculating ensemble score: {str(e)}")
            return np.mean(list(intent_scores.values()))
    
    def _generate_default_scores(self, anon_id: str) -> Dict[str, Any]:
        """Generate default scores when no models available"""
        default_scores = {intent: 0.5 for intent in self.config.target_intents}
        
        return {
            'anon_id': anon_id,
            'intent_scores': default_scores,
            'intent_probabilities': {intent: 0.0 for intent in self.config.target_intents},
            'ensemble_score': 0.5,
            'primary_intent': 'browse_intent',
            'confidence': 0.5,
            'prediction_time': datetime.utcnow().isoformat(),
            'status': 'default_scores'
        }
    
    def _sigmoid(self, x: float) -> float:
        """Sigmoid function to convert logits to probabilities"""
        return 1 / (1 + np.exp(-np.clip(x, -250, 250)))
    
    def _calculate_shap_values(self, model, model_info: Dict) -> Dict:
        """Calculate SHAP values for feature importance"""
        try:
            # This would calculate actual SHAP values
            # For demo, return placeholder
            return {
                'shap_available': False,
                'reason': 'SHAP calculation not implemented in demo'
            }
            
        except Exception as e:
            logger.error(f"Error calculating SHAP values: {str(e)}")
            return {'shap_available': False, 'error': str(e)}
    
    def _store_prediction_result(self, api_key: str, anon_id: str, prediction: Dict):
        """Store prediction result for future analysis"""
        try:
            # Store in feature store for future training
            pk = f"{api_key}#{anon_id}"
            sk = f"prediction#{datetime.utcnow().isoformat()}"
            
            # Calculate TTL (30 days)
            ttl = int((datetime.utcnow() + timedelta(days=30)).timestamp())
            
            self.feature_store_table.put_item(
                Item={
                    'pk': pk,
                    'sk': sk,
                    'gsi1pk': f"{api_key}#predictions",
                    'gsi1sk': datetime.utcnow().isoformat(),
                    'ttl': ttl,
                    'prediction_data': prediction,
                    'data_type': 'intent_prediction'
                }
            )
            
        except Exception as e:
            logger.error(f"Error storing prediction result: {str(e)}")
    
    def _store_model_feedback(self, api_key: str, feedback: Dict):
        """Store model feedback for continuous learning"""
        try:
            pk = f"{api_key}#feedback"
            sk = f"{datetime.utcnow().isoformat()}#{feedback['feedback_id']}"
            
            # Calculate TTL (90 days)
            ttl = int((datetime.utcnow() + timedelta(days=90)).timestamp())
            
            self.feature_store_table.put_item(
                Item={
                    'pk': pk,
                    'sk': sk,
                    'gsi1pk': f"{api_key}#feedback#{feedback['intent_type']}",
                    'gsi1sk': datetime.utcnow().isoformat(),
                    'ttl': ttl,
                    'feedback_data': feedback,
                    'data_type': 'model_feedback'
                }
            )
            
        except Exception as e:
            logger.error(f"Error storing model feedback: {str(e)}")
    
    def _count_recent_feedback(self, api_key: str, intent_type: str) -> int:
        """Count recent feedback for an intent type"""
        try:
            gsi1pk = f"{api_key}#feedback#{intent_type}"
            
            response = self.feature_store_table.query(
                IndexName='GSI1-FeaturesByType',
                KeyConditionExpression=Key('gsi1pk').eq(gsi1pk),
                ScanIndexForward=False,
                Limit=1000  # Count up to 1000 recent feedback items
            )
            
            return len(response.get('Items', []))
            
        except Exception as e:
            logger.error(f"Error counting feedback: {str(e)}")
            return 0
    
    def _store_training_summary(self, api_key: str, summary: Dict):
        """Store training summary in DynamoDB"""
        try:
            pk = f"{api_key}#intent_training"
            sk = f"{datetime.utcnow().isoformat()}"
            
            # Calculate TTL (90 days)
            ttl = int((datetime.utcnow() + timedelta(days=90)).timestamp())
            
            self.feature_store_table.put_item(
                Item={
                    'pk': pk,
                    'sk': sk,
                    'gsi1pk': f"{api_key}#training_summary",
                    'gsi1sk': datetime.utcnow().isoformat(),
                    'ttl': ttl,
                    'training_summary': summary,
                    'data_type': 'training_summary'
                }
            )
            
        except Exception as e:
            logger.error(f"Error storing training summary: {str(e)}")
    
    def _should_skip_training(self, api_key: str) -> bool:
        """Check if we should skip training based on recent models"""
        try:
            # Check for recent training in the last 24 hours
            yesterday = datetime.utcnow() - timedelta(hours=24)
            
            gsi1pk = f"{api_key}#training_summary"
            
            response = self.feature_store_table.query(
                IndexName='GSI1-FeaturesByType',
                KeyConditionExpression=Key('gsi1pk').eq(gsi1pk) & 
                                     Key('gsi1sk').gte(yesterday.isoformat()),
                ScanIndexForward=False,
                Limit=1
            )
            
            return len(response.get('Items', [])) > 0
            
        except Exception as e:
            logger.error(f"Error checking recent training: {str(e)}")
            return False

# Example usage
if __name__ == "__main__":
    # Initialize service
    service = IntentScoringService(
        feature_store_table_name='anon-intent-sdk-feature-store-production',
        events_table_name='anon-intent-sdk-events-production',
        sessions_table_name='anon-intent-sdk-sessions-production',
        s3_bucket_name='anon-intent-sdk-ml-models-production'
    )
    
    # Train intent models
    result = service.train_intent_models('demo-api-key-12345', force_retrain=True)
    print(json.dumps(result, indent=2, default=str))
    
    # Predict intent scores
    sample_features = {
        'click_frequency': 15,
        'scroll_engagement': 0.7,
        'session_count': 3,
        'engagement_score': 0.8,
        'purchase_intent_score': 0.3,
        'search_frequency': 5,
        'form_completion_rate': 0.6
    }
    
    prediction = service.predict_intent_scores(
        'demo-api-key-12345',
        'anon-test-user',
        sample_features
    )
    print(json.dumps(prediction, indent=2))