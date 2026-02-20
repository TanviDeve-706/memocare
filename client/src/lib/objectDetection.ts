import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

let model: cocoSsd.ObjectDetection | null = null;

export interface DetectedObject {
  class: string;
  score: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
}

export interface ObjectSignature {
  objects: DetectedObject[];
  dominantObjects: string[]; // Top 3 most confident objects
  objectCount: number;
}

// ✅ Load COCO-SSD model (from Google CDN, no TFHub / no CORS)
export const loadModel = async (): Promise<cocoSsd.ObjectDetection> => {
  if (model) return model;

  try {
    model = await cocoSsd.load();
    console.log("COCO-SSD model loaded successfully");
    return model;
  } catch (error) {
    console.error("Failed to load object detection model:", error);
    // Fallback dummy model for development/demo
    return {
      detect: async () => [
        { class: "object", score: 0.8, bbox: [10, 10, 100, 100] }
      ]
    } as any;
  }
};

// Detect objects in an image element
export const detectObjects = async (
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<DetectedObject[]> => {
  try {
    const loadedModel = await loadModel();
    const predictions = await loadedModel.detect(imageElement);

    return predictions.map(prediction => ({
      class: prediction.class,
      score: prediction.score,
      bbox: prediction.bbox as [number, number, number, number]
    }));
  } catch (error) {
    console.error("Object detection failed:", error);
    return [];
  }
};

// Create a visual signature for object matching
export const createObjectSignature = (detectedObjects: DetectedObject[]): ObjectSignature => {
  const confidentObjects = detectedObjects.filter(obj => obj.score > 0.5);
  const sortedObjects = confidentObjects.sort((a, b) => b.score - a.score);
  const dominantObjects = sortedObjects.slice(0, 3).map(obj => obj.class);

  return {
    objects: confidentObjects,
    dominantObjects,
    objectCount: confidentObjects.length
  };
};

// Calculate similarity between two object signatures
export const calculateSimilarity = (sig1: ObjectSignature, sig2: ObjectSignature): number => {
  const shared = sig1.dominantObjects.filter(obj => sig2.dominantObjects.includes(obj));
  const total = new Set([...sig1.dominantObjects, ...sig2.dominantObjects]).size;

  if (total === 0) return 0;

  const objectCountSimilarity =
    1 - Math.abs(sig1.objectCount - sig2.objectCount) / Math.max(sig1.objectCount, sig2.objectCount, 1);
  const objectSimilarity = shared.length / total;

  return objectSimilarity * 0.7 + objectCountSimilarity * 0.3;
};

// Find matches in stored object signatures
export const findMatches = (
  newSignature: ObjectSignature,
  storedSignatures: { id: number; signature: ObjectSignature; userTag: string }[]
): Array<{ id: number; userTag: string; confidence: number }> => {
  const matches = storedSignatures
    .map(stored => ({
      id: stored.id,
      userTag: stored.userTag,
      confidence: calculateSimilarity(newSignature, stored.signature)
    }))
    .filter(match => match.confidence >= 0.9) // ✅ Changed to ≥90% threshold
    .sort((a, b) => b.confidence - a.confidence);

  return matches.slice(0, 3);
};

// Process an image for object recognition
export const processImageForRecognition = async (
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
) => {
  const detectedObjects = await detectObjects(imageElement);
  const signature = createObjectSignature(detectedObjects);

  return {
    detectedObjects,
    signature,
    visualFeatures: JSON.stringify(signature)
  };
};
