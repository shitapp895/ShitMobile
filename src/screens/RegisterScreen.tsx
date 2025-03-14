import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const { register } = useAuth();
  
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  const validatePassword = (password: string) => {
    // At least 6 characters for testing (simplified from the 8 with special chars)
    return password.length >= 6;
  };
  
  const validateDisplayName = (name: string) => {
    // 3-20 characters, alphanumeric with spaces allowed
    const displayNameRegex = /^[a-zA-Z0-9 ]{3,20}$/;
    return displayNameRegex.test(name);
  };
  
  const handleRegister = async () => {
    // Validate inputs
    if (!email || !password || !confirmPassword || !displayName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    
    if (!validatePassword(password)) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    if (!validateDisplayName(displayName)) {
      Alert.alert('Error', 'Display name must be 3-20 characters and can only contain letters, numbers, and spaces');
      return;
    }
    
    setLoading(true);
    
    try {
      await register(email, password, displayName);
      Alert.alert('Success', 'Account created successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join the ShitApp community</Text>
        
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Display Name"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          
          <TouchableOpacity 
            style={styles.button}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating Account...' : 'Register'}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366f1',
    marginTop: 60,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  formContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  loginText: {
    color: '#666',
    fontSize: 14,
  },
  loginLink: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: 'bold',
  },
}); 