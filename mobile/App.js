import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  Dimensions,
  SafeAreaView,
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { api } from './src/services/api';

const { width } = Dimensions.get('window');

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home', 'search', 'upload', 'profile'
  
  // Circles Filtering
  const [activeCircle, setActiveCircle] = useState('All');
  const circles = ['All', 'General', 'Hometown', 'College'];
  const uploadCircles = ['General', 'Hometown', 'College'];

  // Auth Form State
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // App Content State
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // Upload State
  const [selectedImage, setSelectedImage] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploadCircle, setUploadCircle] = useState('General');
  const [uploading, setUploading] = useState(false);

  // Check login session on mount
  useEffect(() => {
    checkSession();
  }, []);

  // Fetch posts when user logs in or active circle changes
  useEffect(() => {
    if (isLoggedIn) {
      loadPosts();
    }
  }, [isLoggedIn, activeCircle]);

  const checkSession = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const user = await AsyncStorage.getItem('user');
      if (token && user) {
        setCurrentUser(JSON.parse(user));
        setIsLoggedIn(true);
      }
    } catch (e) {
      console.log('Session restore error:', e);
    }
  };

  const loadPosts = async () => {
    setPostsLoading(true);
    try {
      const data = await api.get(`/api/posts?circle=${activeCircle}`);
      setPosts(data);
    } catch (error) {
      console.log('Error loading posts:', error.message);
    } finally {
      setPostsLoading(false);
    }
  };

  const handleAuthSubmit = async () => {
    if (!email || !password || (!isLogin && !username)) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setAuthLoading(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      const body = isLogin 
        ? { email, password }
        : { username, email, password };

      const data = await api.post(endpoint, body);

      if (data.token) {
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        setCurrentUser(data.user);
        setIsLoggedIn(true);
        setCurrentScreen('home');
      }
    } catch (error) {
      Alert.alert('Authentication Failed', error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setIsLoggedIn(false);
      setCurrentUser(null);
      setPosts([]);
      setActiveCircle('All');
      setCurrentScreen('home');
    } catch (e) {
      console.log('Logout error:', e);
    }
  };

  // Image Picking
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to select photos!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0]);
    }
  };

  // Post Upload
  const handleUpload = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      
      const uri = selectedImage.uri;
      const fileType = uri.substring(uri.lastIndexOf('.') + 1);
      const fileName = uri.split('/').pop();

      formData.append('image', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: fileName || `photo.${fileType}`,
        type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`
      });
      formData.append('caption', caption);
      formData.append('circle', uploadCircle);

      const response = await api.postMultipart('/api/posts', formData);

      if (response && response.post) {
        Alert.alert('Success', 'Post uploaded successfully! 🎉');
        setSelectedImage(null);
        setCaption('');
        setUploadCircle('General');
        loadPosts();
        setCurrentScreen('home');
      } else {
        Alert.alert('Error', 'Upload response invalid');
      }
    } catch (error) {
      Alert.alert('Upload Failed', error.message);
    } finally {
      setUploading(false);
    }
  };

  // ==================== SCREENS ====================

  const renderAuthScreen = () => (
    <KeyboardAvoidingView 
      style={styles.authContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.authBox}>
        <Text style={styles.logo}>Inasta</Text>
        <Text style={styles.subtitle}>
          {isLogin ? 'Welcome back!' : 'Create account'}
        </Text>

        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#7a8599"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#7a8599"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#7a8599"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleAuthSubmit}
          disabled={authLoading}
        >
          {authLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isLogin ? 'Log In' : 'Sign Up'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.toggleContainer}>
          <Text style={styles.toggleText}>
            {isLogin 
              ? "Don't have an account? Sign Up" 
              : 'Already have an account? Log In'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const renderHomeFeed = () => (
    <View style={styles.feedContainer}>
      <Text style={styles.headerText}>Inasta</Text>
      
      {/* Horizontal Circle Scroll Menu */}
      <View style={{ marginBottom: 16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.circleScroll}>
          {circles.map((circle) => {
            const isActive = activeCircle === circle;
            const icon = circle === 'All' ? '🌐 ' : circle === 'General' ? '💬 ' : circle === 'Hometown' ? '🏡 ' : '🎓 ';
            return (
              <TouchableOpacity
                key={circle}
                onPress={() => setActiveCircle(circle)}
                style={[styles.circlePill, isActive && styles.circlePillActive]}
              >
                <Text style={[styles.circlePillText, isActive && styles.circlePillTextActive]}>
                  {icon}{circle}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {postsLoading ? (
        <ActivityIndicator color="#0095f6" style={{ marginTop: 40 }} />
      ) : posts.length === 0 ? (
        <View style={styles.emptyFeed}>
          <Text style={styles.emptyFeedText}>No posts in {activeCircle}</Text>
          <Text style={styles.emptyFeedSubtext}>Be the first to share in this circle!</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const user = item.user || {};
            const initial = user.username ? user.username[0].toUpperCase() : 'U';
            return (
              <View style={styles.postCard}>
                <View style={styles.postHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initial}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.usernameText}>{user.username || 'unknown'}</Text>
                    {item.circle && item.circle !== 'General' && (
                      <Text style={{ fontSize: 11, color: '#0095f6', marginTop: 1 }}>
                        shared to {item.circle}
                      </Text>
                    )}
                  </View>
                </View>
                <Image source={{ uri: item.image }} style={styles.postImage} />
                <View style={styles.postActions}>
                  <Text style={styles.actionIcon}>♡</Text>
                  <Text style={styles.actionIcon}>💬</Text>
                  <Text style={styles.actionIcon}>↗</Text>
                </View>
                {item.caption ? (
                  <View style={styles.captionContainer}>
                    <Text style={styles.captionUser}>{user.username || 'user'}</Text>
                    <Text style={styles.captionText}>{item.caption}</Text>
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </View>
  );

  const renderSearchScreen = () => (
    <View style={styles.feedContainer}>
      <Text style={styles.headerText}>Search</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Search users..." 
        placeholderTextColor="#7a8599"
      />
      <View style={styles.emptyFeed}>
        <Text style={styles.emptyFeedText}>Discover Creators</Text>
        <Text style={styles.emptyFeedSubtext}>Search functions coming soon</Text>
      </View>
    </View>
  );

  const renderUploadScreen = () => (
    <View style={styles.feedContainer}>
      <Text style={styles.headerText}>Create Post</Text>
      
      {!selectedImage ? (
        <TouchableOpacity style={styles.uploadCard} onPress={pickImage}>
          <Text style={styles.uploadPlus}>+</Text>
          <Text style={styles.uploadText}>Select photo from library</Text>
        </TouchableOpacity>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
          
          <TextInput
            style={[styles.input, styles.captionInput]}
            placeholder="Write a caption..."
            placeholderTextColor="#7a8599"
            value={caption}
            onChangeText={setCaption}
            multiline
            numberOfLines={3}
          />

          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: '#8f9cae', fontSize: 14, fontWeight: '600', marginBottom: 10 }}>
              Share to Circle
            </Text>
            <View style={styles.circleSelectorGrid}>
              {uploadCircles.map((circle) => {
                const isSelected = uploadCircle === circle;
                return (
                  <TouchableOpacity
                    key={circle}
                    onPress={() => setUploadCircle(circle)}
                    style={[styles.circleSelectBtn, isSelected && styles.circleSelectBtnSelected]}
                  >
                    <Text style={[styles.circleSelectText, isSelected && styles.circleSelectTextActive]}>
                      {circle === 'General' ? '💬 General' : circle === 'Hometown' ? '🏡 Hometown' : '🎓 College'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.uploadButtonGroup}>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.cancelBtn]} 
              onPress={() => { setSelectedImage(null); setCaption(''); setUploadCircle('General'); }}
            >
              <Text style={styles.actionBtnText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionBtn, styles.shareBtn]} 
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionBtnText}>Share</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );

  const renderProfileScreen = () => {
    const user = currentUser || {};
    const userPosts = posts.filter(post => post.user?._id === user.id || post.user === user.id);
    const initial = user.username ? user.username[0].toUpperCase() : 'U';

    return (
      <View style={styles.feedContainer}>
        <View style={styles.profileHeader}>
          <Text style={styles.profileUsername}>{user.username || 'Profile'}</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{initial}</Text>
          </View>
          <View style={styles.profileStats}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{userPosts.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>
        </View>

        <View style={styles.bioContainer}>
          <Text style={styles.profileDisplayName}>{user.username}</Text>
          <Text style={styles.profileBio}>No bio yet</Text>
          <View style={styles.privateBadge}>
            <Text style={styles.privateText}>Private Account</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.editBtn}>
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>

        <FlatList
          data={userPosts}
          keyExtractor={(item) => item._id}
          numColumns={3}
          style={styles.gridList}
          renderItem={({ item }) => (
            <Image source={{ uri: item.image }} style={styles.gridImage} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyGrid}>
              <Text style={styles.emptyGridTitle}>No Posts Yet</Text>
              <Text style={styles.emptyGridSubtitle}>Photos you share will appear here.</Text>
            </View>
          }
        />
      </View>
    );
  };

  if (!isLoggedIn) {
    return renderAuthScreen();
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }}>
        {currentScreen === 'home' && renderHomeFeed()}
        {currentScreen === 'search' && renderSearchScreen()}
        {currentScreen === 'upload' && renderUploadScreen()}
        {currentScreen === 'profile' && renderProfileScreen()}
      </View>

      {/* Bottom Nav Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('home')}>
          <Text style={[styles.navIcon, currentScreen === 'home' && styles.navIconActive]}>🏠</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('search')}>
          <Text style={[styles.navIcon, currentScreen === 'search' && styles.navIconActive]}>🔍</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('upload')}>
          <Text style={[styles.navIcon, currentScreen === 'upload' && styles.navIconActive]}>➕</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('profile')}>
          <Text style={[styles.navIcon, currentScreen === 'profile' && styles.navIconActive]}>👤</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030407',
  },
  authContainer: {
    flex: 1,
    backgroundColor: '#030407',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  authBox: {
    backgroundColor: 'rgba(18, 20, 29, 0.75)',
    borderRadius: 24,
    padding: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -1.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#8f9cae',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  button: {
    backgroundColor: '#0095f6',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#0095f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleContainer: {
    marginTop: 20,
  },
  toggleText: {
    color: '#0095f6',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // App Layout Styles
  feedContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 36 : 10,
  },
  headerText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  emptyFeed: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyFeedText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  emptyFeedSubtext: {
    fontSize: 14,
    color: '#8f9cae',
  },

  // Circle Filter styling
  circleScroll: {
    paddingRight: 10,
  },
  circlePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  circlePillActive: {
    backgroundColor: '#0095f6',
    borderColor: 'transparent',
  },
  circlePillText: {
    color: '#8f9cae',
    fontSize: 13,
    fontWeight: '600',
  },
  circlePillTextActive: {
    color: '#fff',
  },

  // Circle selector grid
  circleSelectorGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  circleSelectBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  circleSelectBtnSelected: {
    backgroundColor: 'rgba(0, 149, 246, 0.08)',
    borderColor: '#0095f6',
  },
  circleSelectText: {
    color: '#8f9cae',
    fontSize: 12,
    fontWeight: '600',
  },
  circleSelectTextActive: {
    color: '#0095f6',
  },

  // Post Card Styles
  postCard: {
    backgroundColor: 'rgba(18, 20, 29, 0.4)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 20,
    overflow: 'hidden',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0095f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  usernameText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  postImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#12131a',
  },
  postActions: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 18,
  },
  actionIcon: {
    fontSize: 20,
    color: '#8f9cae',
  },
  captionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 8,
  },
  captionUser: {
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 6,
    fontSize: 14,
  },
  captionText: {
    color: '#e2e8f0',
    fontSize: 14,
    flex: 1,
  },

  // Upload Styles
  uploadCard: {
    width: '100%',
    height: 280,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  uploadPlus: {
    fontSize: 36,
    color: '#0095f6',
  },
  uploadText: {
    color: '#8f9cae',
    fontWeight: '600',
    fontSize: 14,
  },
  previewImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    marginBottom: 16,
  },
  captionInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  uploadButtonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  shareBtn: {
    backgroundColor: '#0095f6',
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },

  // Profile Styles
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileUsername: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  logoutBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  logoutText: {
    color: '#f87171',
    fontWeight: '600',
    fontSize: 13,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#5a12ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  profileStats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: 20,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#8f9cae',
    fontSize: 12,
    marginTop: 2,
  },
  bioContainer: {
    marginBottom: 16,
  },
  profileDisplayName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileBio: {
    color: '#cbd5e1',
    fontSize: 14,
    marginBottom: 8,
  },
  privateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 149, 246, 0.08)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  privateText: {
    color: '#0095f6',
    fontSize: 11,
    fontWeight: '600',
  },
  editBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  editBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  gridList: {
    flex: 1,
  },
  gridImage: {
    width: (width - 32 - 4) / 3,
    aspectRatio: 1,
    margin: 1,
    borderRadius: 4,
  },
  emptyGrid: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyGridTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emptyGridSubtitle: {
    color: '#8f9cae',
    fontSize: 13,
  },

  // Bottom Navigation
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(10, 11, 16, 0.85)',
    paddingVertical: 12,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    fontSize: 20,
    color: '#64748b',
  },
  navIconActive: {
    color: '#0095f6',
  },
});
