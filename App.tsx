import * as React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider } from './src/context/AuthContext';
import { TaskProvider } from './src/context/TaskContext';
import Root from './src/screens/HomeScreen';

export default function App() {
  return (
    <PaperProvider>
      <AuthProvider>
        <TaskProvider>
          <Root />
        </TaskProvider>
      </AuthProvider>
    </PaperProvider>
  );
}
