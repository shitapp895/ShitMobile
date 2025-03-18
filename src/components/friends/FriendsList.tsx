import React from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  RefreshControl, 
  ActivityIndicator, 
  StyleSheet
} from 'react-native';
import { FriendData } from '../../types/friend';
import FriendItem from './FriendItem';
import { Ionicons } from '@expo/vector-icons';

interface FriendsListProps {
  friends: FriendData[];
  loading: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onRemoveFriend: (friendId: string) => void;
  onAddFriendPress?: () => void;
  hideHeader?: boolean;
  tabType?: 'all' | 'online' | 'requests';
}

const FriendsList: React.FC<FriendsListProps> = ({ 
  friends, 
  loading, 
  refreshing = false, 
  onRefresh, 
  onRemoveFriend,
  onAddFriendPress,
  hideHeader = false,
  tabType = 'all'
}) => {
  // Convert tabType to a type that's usable for our internal logic
  const listType = tabType === 'requests' ? 'all' : tabType;
  
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6466f1" />
        <Text style={styles.loadingText}>Loading friends...</Text>
      </View>
    );
  }

  const getEmptyMessage = () => {
    switch(listType) {
      case 'online':
        return {
          title: 'No friends online',
          subtitle: 'Your online friends will appear here'
        };
      default:
        return {
          title: 'No friends yet',
          subtitle: 'Add friends to get started'
        };
    }
  };

  return (
    <View style={styles.container}>
      {friends.length > 0 ? (
        <FlatList
          data={friends}
          renderItem={({ item }) => (
            <FriendItem 
              friend={item} 
              onRemoveFriend={onRemoveFriend} 
            />
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#6466f1']}
                tintColor="#6466f1"
              />
            ) : undefined
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          {listType === 'online' && (
            <Ionicons name="person" size={48} color="#8e8e93" style={styles.emptyIcon} />
          )}
          {listType === 'all' && (
            <Ionicons name="people" size={48} color="#8e8e93" style={styles.emptyIcon} />
          )}
          <Text style={styles.emptyText}>{getEmptyMessage().title}</Text>
          <Text style={styles.emptySubtext}>{getEmptyMessage().subtitle}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
    paddingHorizontal: 16,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f2f2f7',
  },
  loadingText: {
    marginTop: 12,
    color: '#8e8e93',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  emptyText: {
    marginTop: 10,
    color: '#8e8e93',
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 8,
    color: '#8e8e93',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyIcon: {
    marginBottom: 10,
  }
});

export default FriendsList; 