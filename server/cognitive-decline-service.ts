import * as tf from '@tensorflow/tfjs';
import { RandomForestClassifier } from 'ml-random-forest';

export interface PatientActivityData {
  gameScores: number[];
  routineCompletion: number[];
  medicationAdherence: number[];
  journalSentiment: number[];
}

export interface TimeSeriesDataset {
  features: number[][];
  labels: number[];
  timestamps: Date[];
}

export interface PredictionResult {
  predictedCognitiveScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  cognitiveDeclineDetected: boolean;
  confidence: number;
  modelUsed: 'RANDOM_FOREST' | 'LSTM' | 'ENSEMBLE';
  timestamp: Date;
}

export class CognitivDeclineService {
  private randomForestModel: RandomForestClassifier | null = null;
  private lstmModel: tf.Sequential | null = null;
  private preprocessingStats: { means: number[]; stds: number[] } | null = null;

  public preprocessPatientData(data: PatientActivityData): number[] {
    const features: number[] = [];
    features.push(...this.calculateStatistics(data.gameScores));
    features.push(...this.calculateStatistics(data.routineCompletion));
    features.push(...this.calculateStatistics(data.medicationAdherence));
    features.push(...this.calculateStatistics(data.journalSentiment));
    features.push(...this.calculateTrends(data));
    return this.normalizeFeatures(features);
  }

  private calculateStatistics(values: number[]): number[] {
    if (values.length === 0) return [0, 0, 0, 0];
    const mean = values.reduce((a, b) => a + b) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return [mean, std, min, max];
  }

  private calculateTrends(data: PatientActivityData): number[] {
    const trends: number[] = [];
    trends.push(this.calculateLinearTrend(data.gameScores));
    trends.push(this.calculateLinearTrend(data.routineCompletion));
    trends.push(this.calculateLinearTrend(data.medicationAdherence));
    trends.push(this.calculateLinearTrend(data.journalSentiment));
    return trends;
  }

  private calculateLinearTrend(values: number[]): number {
    if (values.length < 2) return 0;
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b) / n;
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (x[i] - xMean) * (values[i] - yMean);
      denominator += Math.pow(x[i] - xMean, 2);
    }
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private normalizeFeatures(features: number[]): number[] {
    if (!this.preprocessingStats) {
      this.preprocessingStats = {
        means: features.map((_, i) => 0),
        stds: features.map((_, i) => 1),
      };
    }
    return features.map((val, i) => {
      const mean = this.preprocessingStats!.means[i];
      const std = this.preprocessingStats!.stds[i];
      return std === 0 ? 0 : (val - mean) / std;
    });
  }

  public trainRandomForestModel(trainingData: TimeSeriesDataset): void {
    const options = {
      numTrees: 100,
      maxFeatures: Math.sqrt(trainingData.features[0].length),
      minSamplesPerNode: 5,
      maxDepth: 20,
      replacement: true,
    };
    this.randomForestModel = new RandomForestClassifier(options);
    this.randomForestModel.train(trainingData.features, trainingData.labels);
    console.log('Random Forest model trained successfully');
  }

  public async trainLSTMModel(trainingData: TimeSeriesDataset): Promise<void> {
    const windowSize = 10;
    const { xData, yData } = this.createLSTMDataset(trainingData.features, trainingData.labels, windowSize);
    
    this.lstmModel = tf.sequential({
      layers: [
        tf.layers.lstm({ units: 64, returnSequences: true, inputShape: [windowSize, trainingData.features[0].length] }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.lstm({ units: 32, returnSequences: false }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' }),
      ],
    });

    this.lstmModel.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
    });

    await this.lstmModel.fit(xData, yData, {
      epochs: 50,
      batchSize: 32,
      validationSplit: 0.2,
      verbose: 1,
    });

    xData.dispose();
    yData.dispose();
    console.log('LSTM model trained successfully');
  }

  private createLSTMDataset(
    features: number[][],
    labels: number[],
    windowSize: number
  ): { xData: tf.Tensor3D; yData: tf.Tensor2D } {
    const xList: number[][][] = [];
    const yList: number[] = [];

    for (let i = windowSize; i < features.length; i++) {
      xList.push(features.slice(i - windowSize, i));
      yList.push(labels[i]);
    }

    const xData = tf.tensor3d(xList);
    const yData = tf.tensor2d(yList, [yList.length, 1]);

    return { xData, yData };
  }

  public async predictCognitiveDecline(newData: PatientActivityData): Promise<PredictionResult> {
    const features = this.preprocessPatientData(newData);
    let score = 0;
    let confidence = 0;

    if (this.randomForestModel) {
      const rfPrediction = this.randomForestModel.predict([features])[0];
      score += rfPrediction * 0.5;
      confidence += 0.5;
    }

    if (this.lstmModel) {
      const lstmInput = tf.tensor3d([[[...features]]]);
      const lstmPrediction = this.lstmModel.predict(lstmInput) as tf.Tensor;
      const lstmValue = (await lstmPrediction.data())[0];
      score += lstmValue * 100 * 0.5;
      confidence += 0.5;
      lstmInput.dispose();
      lstmPrediction.dispose();
    }

    const normalizedScore = Math.min(100, Math.max(0, score / confidence));

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    let cognitiveDeclineDetected = false;

    if (normalizedScore >= 70) {
      riskLevel = 'HIGH';
      cognitiveDeclineDetected = true;
    } else if (normalizedScore >= 40) {
      riskLevel = 'MEDIUM';
      cognitiveDeclineDetected = normalizedScore >= 55;
    } else {
      riskLevel = 'LOW';
      cognitiveDeclineDetected = false;
    }

    return {
      predictedCognitiveScore: Math.round(normalizedScore * 10) / 10,
      riskLevel,
      cognitiveDeclineDetected,
      confidence: Math.round(confidence * 100) / 100,
      modelUsed: this.lstmModel && this.randomForestModel ? 'ENSEMBLE' : this.lstmModel ? 'LSTM' : 'RANDOM_FOREST',
      timestamp: new Date(),
    };
  }

  public static getInstance(): CognitivDeclineService {
    if (!CognitivDeclineService.instance) {
      CognitivDeclineService.instance = new CognitivDeclineService();
    }
    return CognitivDeclineService.instance;
  }

  private static instance: CognitivDeclineService;
}

export async function predictCognitiveDecline(patientData: PatientActivityData): Promise<PredictionResult> {
  const service = CognitivDeclineService.getInstance();
  return service.predictCognitiveDecline(patientData);
}