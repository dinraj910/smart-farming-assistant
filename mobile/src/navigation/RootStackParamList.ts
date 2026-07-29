export type RootStackParamList = {
  Welcome: undefined;
  Home: undefined;
  CropDetail: {
    cropName?: string;
    yieldData?: string;
    harvestDate?: string;
    imageUri?: string;
  };
};
