import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export default function ProfileScreen() {
  const { userData, logout, updateUserProfile } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(userData?.displayName || '');
  const [photoURL, setPhotoURL] = useState(userData?.photoURL || '');
  const [loading, setLoading] = useState(false);
  
  // Format duration in minutes and seconds
  const formatDuration = (milliseconds: number) => {
    if (!milliseconds) return '0m 0s';
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };
  
  // Handle profile update
  const handleUpdateProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Display name cannot be empty');
      return;
    }
    
    setLoading(true);
    
    try {
      await updateUserProfile(displayName, photoURL);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Update Failed', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error: any) {
      Alert.alert('Logout Failed', error.message || 'Failed to logout');
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          {userData?.photoURL ? (
            <Image 
              source={{ uri: userData.photoURL }} 
              style={styles.profileImage} 
            />
          ) : (
            <View style={styles.defaultProfileImage}>
              <Text style={styles.defaultProfileText}>
                {userData?.displayName?.charAt(0) || '?'}
              </Text>
            </View>
          )}
          
          {isEditing && (
            <TouchableOpacity style={styles.editImageButton}>
              <Ionicons name="camera" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
        
        {isEditing ? (
          <TextInput
            style={styles.nameInput}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Display Name"
          />
        ) : (
          <Text style={styles.displayName}>
            {userData?.displayName || 'User'}
          </Text>
        )}
        
        <Text style={styles.email}>{userData?.email || ''}</Text>
        
        {isEditing ? (
          <View style={styles.editButtonsContainer}>
            <TouchableOpacity 
              style={[styles.editButton, styles.cancelButton]}
              onPress={() => {
                setIsEditing(false);
                setDisplayName(userData?.displayName || '');
                setPhotoURL(userData?.photoURL || '');
              }}
            >
              <Text style={styles.editButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.editButton, styles.saveButton]}
              onPress={handleUpdateProfile}
              disabled={loading}
            >
              <Text style={styles.editButtonText}>
                {loading ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.editProfileButton}
            onPress={() => setIsEditing(true)}
          >
            <Ionicons name="create-outline" size={16} color="#fff" style={styles.editIcon} />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Your Stats</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userData?.totalShits || 0}</Text>
            <Text style={styles.statLabel}>Total Shits</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatDuration(userData?.averageShitDuration || 0)}
            </Text>
            <Text style={styles.statLabel}>Average Duration</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatDuration(userData?.totalShitDuration || 0)}
            </Text>
            <Text style={styles.statLabel}>Total Time</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userData?.friends?.length || 0}</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.settingsContainer}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <TouchableOpacity style={styles.settingItem}>
          <Ionicons name="notifications-outline" size={24} color="#6366f1" style={styles.settingIcon} />
          <Text style={styles.settingText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem}>
          <Ionicons name="lock-closed-outline" size={24} color="#6366f1" style={styles.settingIcon} />
          <Text style={styles.settingText}>Privacy</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem}>
          <Ionicons name="help-circle-outline" size={24} color="#6366f1" style={styles.settingIcon} />
          <Text style={styles.settingText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.settingItem, styles.logoutItem]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color="#ef4444" style={styles.settingIcon} />
          <Text style={[styles.settingText, styles.logoutText]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  defaultProfileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultProfileText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6366f1',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  nameInput: {
    fontSize: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    width: '80%',
    textAlign: 'center',
    marginBottom: 10,
  },
  email: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 15,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  editIcon: {
    marginRight: 5,
  },
  editProfileText: {
    color: '#fff',
    fontWeight: '500',
  },
  editButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginTop: 10,
  },
  editButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#9ca3af',
  },
  saveButton: {
    backgroundColor: '#6366f1',
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  statsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1f2937',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  settingsContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingIcon: {
    marginRight: 15,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  logoutItem: {
    marginTop: 20,
  },
  logoutText: {
    color: '#ef4444',
  },
}); 