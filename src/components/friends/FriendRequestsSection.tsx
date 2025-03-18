import React from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FriendRequestItem from './FriendRequestItem';
import { FriendRequest } from '../../services/database/friendRequestService';

interface FriendRequestsSectionProps {
  receivedRequests: FriendRequest[];
  sentRequests: FriendRequest[];
  loading: boolean;
  onAccept: (requestId: string) => Promise<void>;
  onDecline: (requestId: string) => Promise<void>;
  onCancel: (requestId: string) => Promise<void>;
}

const FriendRequestsSection: React.FC<FriendRequestsSectionProps> = ({
  receivedRequests,
  sentRequests,
  loading,
  onAccept,
  onDecline,
  onCancel,
}) => {
  const hasReceivedRequests = receivedRequests.length > 0;
  const hasSentRequests = sentRequests.length > 0;
  const hasNoRequests = !hasReceivedRequests && !hasSentRequests;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6466f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Received Requests Section */}
      {hasReceivedRequests && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Friend Requests</Text>
          <FlatList
            data={receivedRequests}
            keyExtractor={(item) => item.id!}
            renderItem={({ item }) => (
              <FriendRequestItem
                item={item}
                isReceived={true}
                onAccept={onAccept}
                onDecline={onDecline}
              />
            )}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Sent Requests Section */}
      {hasSentRequests && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sent Requests</Text>
          <FlatList
            data={sentRequests}
            keyExtractor={(item) => item.id!}
            renderItem={({ item }) => (
              <FriendRequestItem
                item={item}
                isReceived={false}
                onCancel={onCancel}
              />
            )}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Empty State */}
      {hasNoRequests && (
        <View style={styles.emptyContainer}>
          <Ionicons name="people" size={32} color="#8e8e93" style={styles.emptyIcon} />
          <Text style={styles.emptyText}>No friend requests</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    marginTop: 24,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
  },
});

export default FriendRequestsSection; 