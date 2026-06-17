"""
南宁家政 AI 定价 — XGBoost 模型封装
=====================================
提供训练、预测、保存、加载、特征重要性分析等功能。
"""

import os
import json
import warnings
from datetime import datetime
from typing import Optional, Dict, List, Tuple, Any

import numpy as np
import pandas as pd
import xgboost as xgb

warnings.filterwarnings("ignore")


class MLPricingModel:
    """XGBoost 定价倍率预测模型"""

    def __init__(self, params: Optional[Dict] = None):
        """
        Args:
            params: XGBoost 超参数字典，为 None 时使用默认参数
        """
        self.params = params or {
            "objective": "reg:squarederror",
            "eval_metric": "mae",
            "max_depth": 5,
            "learning_rate": 0.05,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "min_child_weight": 3,
            "gamma": 0.1,
            "reg_alpha": 0.1,
            "reg_lambda": 1.0,
            "seed": 42,
        }
        self.model: Optional[xgb.Booster] = None
        self._feature_names: List[str] = []
        self._train_date: Optional[str] = None
        self._train_score: Optional[Dict] = None
        self._feature_importance: Optional[Dict] = None

    def train(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        eval_set: Optional[List[Tuple[pd.DataFrame, pd.Series]]] = None,
        verbose: bool = True,
    ) -> Dict:
        """
        训练 XGBoost 模型。

        Args:
            X: 特征矩阵
            y: 目标变量（最优定价倍率）
            eval_set: 验证集列表 [(X_val, y_val)]
            verbose: 是否打印训练过程

        Returns:
            训练得分 dict
        """
        self._feature_names = list(X.columns)

        dtrain = xgb.DMatrix(X, label=y, feature_names=self._feature_names)
        evals = [(dtrain, "train")]

        if eval_set:
            for i, (X_val, y_val) in enumerate(eval_set):
                dval = xgb.DMatrix(X_val, label=y_val,
                                   feature_names=self._feature_names)
                evals.append((dval, f"val_{i}"))

        self.model = xgb.train(
            self.params,
            dtrain,
            num_boost_round=500,
            evals=evals,
            early_stopping_rounds=30,
            verbose_eval=50 if verbose else False,
        )

        # 计算训练集得分
        y_pred_train = self.predict(X)
        train_mae = np.mean(np.abs(y_pred_train - y))
        train_rmse = np.sqrt(np.mean((y_pred_train - y) ** 2))
        train_r2 = 1 - np.sum((y - y_pred_train) ** 2) / np.sum((y - np.mean(y)) ** 2)

        # 计算验证集得分（如果提供了 eval_set）
        val_mae = None
        val_rmse = None
        val_mape = None
        if eval_set:
            X_val, y_val = eval_set[0]
            y_pred_val = self.predict(X_val)
            val_mae = round(np.mean(np.abs(y_pred_val - y_val)), 4)
            val_rmse = round(np.sqrt(np.mean((y_pred_val - y_val) ** 2)), 4)
            val_mape = round(np.mean(np.abs((y_val - y_pred_val) / (y_val + 1e-6))) * 100, 2)

        self._train_score = {
            "train_R2": round(train_r2, 4),
            "train_MAE": round(train_mae, 4),
            "train_RMSE": round(train_rmse, 4),
            "val_MAE": val_mae,
            "val_RMSE": val_rmse,
            "val_MAPE(%)": val_mape,
            "best_iteration": self.model.best_iteration if hasattr(self.model, "best_iteration") else None,
        }

        # 特征重要性
        importance = self.model.get_score(importance_type="gain")
        total = sum(importance.values())
        self._feature_importance = {
            k: round(v / total * 100, 2) for k, v in
            sorted(importance.items(), key=lambda x: x[1], reverse=True)
        }

        self._train_date = datetime.now().strftime("%Y-%m-%d %H:%M")
        return self._train_score

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """
        预测定价倍率。

        Args:
            X: 特征矩阵

        Returns:
            预测的定价倍率数组
        """
        if self.model is None:
            raise RuntimeError("模型尚未训练或加载，请先调用 train() 或 load()")

        dmatrix = xgb.DMatrix(X, feature_names=self._feature_names)
        return self.model.predict(dmatrix)

    def predict_single(self, features: Dict[str, float]) -> float:
        """预测单个样本的定价倍率"""
        df = pd.DataFrame([features])
        # 确保特征列顺序与训练一致
        df = df.reindex(columns=self._feature_names, fill_value=0)
        return float(self.predict(df)[0])

    def save(self, path: str):
        """
        保存模型及元数据到文件。

        Args:
            path: 输出路径（不含扩展名），会生成 .json 和 .meta.json
        """
        if self.model is None:
            raise RuntimeError("没有已训练的模型可保存")

        model_path = path + ".json"
        self.model.save_model(model_path)

        meta = {
            "train_date": self._train_date,
            "feature_names": self._feature_names,
            "params": self.params,
            "train_score": self._train_score,
            "feature_importance": self._feature_importance,
        }
        meta_path = path + ".meta.json"
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)

        print(f"[OK] 模型已保存: {model_path}")
        print(f"[OK] 元数据已保存: {meta_path}")

    def load(self, path: str):
        """
        从文件加载模型。

        Args:
            path: 模型路径（不含扩展名）
        """
        model_path = path + ".json"
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"模型文件未找到: {model_path}")

        self.model = xgb.Booster()
        self.model.load_model(model_path)

        # 尝试加载元数据
        meta_path = path + ".meta.json"
        if os.path.exists(meta_path):
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
            self._feature_names = meta.get("feature_names", [])
            self._train_date = meta.get("train_date")
            self._train_score = meta.get("train_score")
            self._feature_importance = meta.get("feature_importance")

        print(f"[OK] 模型已加载: {model_path}")

    def get_feature_importance(self) -> Dict[str, float]:
        """返回特征重要性（按 gain 排序，百分比）"""
        if self._feature_importance is None:
            raise RuntimeError("模型尚未训练，无特征重要性数据")
        return self._feature_importance

    def get_model_info(self) -> Dict:
        """返回模型信息摘要"""
        return {
            "model_type": "XGBoost",
            "params": self.params,
            "train_date": self._train_date,
            "train_score": self._train_score,
            "feature_importance": self._feature_importance,
            "feature_count": len(self._feature_names) if self._feature_names else 0,
        }
