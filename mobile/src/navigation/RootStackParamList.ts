export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Main: { screen?: string } | undefined;
  AgentChat: { fieldId: string };
  FieldDetail: { fieldId: string };
};

export type MainTabParamList = {
  Home:      undefined;
  Assistant: undefined;
  Doctor:    undefined;
  Weather:   undefined;
  Market:    undefined;
  Farms:     undefined;
};
