import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MapScreen } from './src/features/map/MapScreen';
import { configureMapRequests } from './src/providers/basemap';

configureMapRequests();

export default function App() {
  return <SafeAreaProvider><StatusBar style="dark" /><MapScreen /></SafeAreaProvider>;
}
