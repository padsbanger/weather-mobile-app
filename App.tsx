import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MapScreen } from './src/features/map/MapScreen';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';

export default function App() {
  return <SafeAreaProvider><ThemeProvider><AppContent /></ThemeProvider></SafeAreaProvider>;
}
function AppContent() {
  const { resolved } = useTheme();
  return <><StatusBar style={resolved === 'dark' ? 'light' : 'dark'} /><MapScreen /></>;
}
