export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Main: { screen?: string } | undefined;
  AgentChat: {
    fieldId: string;
    fieldName: string;
    district: string;
    crop?: string;
    acres?: number;
    farmId?: string; // DB UUID of the farm; undefined for fallback static fields
  };
  FieldDetail: { fieldId: string };
  CropDetail?: {
    cropName?: string;
    yieldData?: string;
    harvestDate?: string;
    imageUri?: string;
  };
  EditProfile: undefined;
};

export type MainTabParamList = {
  Home:      undefined;
  Assistant: undefined;
  Doctor:    undefined;
  Weather:   undefined;
  Market:    undefined;
  Farms:     undefined;
};
