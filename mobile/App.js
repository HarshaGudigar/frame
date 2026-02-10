import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';

export default function App() {
  const [message, setMessage] = useState('Loading...');

  // Use 10.0.2.2 for Android Emulator to access host machine's localhost
  // Use localhost for iOS Simulator
  const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(err => setMessage('Error: ' + err.message));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 20,
  }
});
