import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../../config';


const GroupChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const scrollViewRef = useRef(null);
  
  const { groupId, groupName, onlineMembers } = route.params;

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const formatMessageTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      // 同一天只显示时间
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    } else {
      // 不同日期，显示日期和时间
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${month}/${day} ${hours}:${minutes}`;
    }
  };

  // 获取当前用户信息
  const getCurrentUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        try {
          // 解析 JWT token 获取用户信息（注意：这里只是解析，不验证签名）
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          
          const tokenData = JSON.parse(jsonPayload);
          console.log('从token解析的用户数据:', tokenData);
          
          const userInfo = {
            u_id: tokenData.u_id,
            u_name: tokenData.u_name,
            u_mail: tokenData.u_mail
          };
          
          // 保存用户数据到 AsyncStorage
          await AsyncStorage.setItem('userData', JSON.stringify(userInfo));
          setCurrentUser(userInfo);
          return userInfo;
        } catch (tokenError) {
          console.error('解析token失败:', tokenError);
        }
      }
      
      return null;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return null;
    }
  };

  // 从后端获取聊天信息
  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 首先确保获取到当前用户信息
      let user = currentUser;
      if (!user) {
        user = await getCurrentUser();
        if (!user) {
          throw new Error('无法获取用户信息，请重新登录');
        }
      }
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('用户未认证，请重新登录');
      }

      const response = await fetch(`${BASE_URL}/groups/${groupId}/messages`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let errorMessage = `请求失败，状态码: ${response.status}`;
        try {
          const errorData = await response.text();
          if (errorData) {
            try {
              const parsedError = JSON.parse(errorData);
              errorMessage += ` - ${parsedError.message || JSON.stringify(parsedError).substring(0, 100)}`;
            } catch (e) {
              errorMessage += ` - ${errorData.substring(0, 100)}`;
            }
          }
        } catch (e) {
          console.log('无法读取错误响应体', e);
        }
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error('响应不是 JSON 格式:', responseText.substring(0, 200));
        throw new Error('服务器返回了非 JSON 格式的响应');
      }

      const rawData = await response.json();
      
      // 设置消息数据的格式
      const formattedMessages = rawData.map(message => ({
        id: message.id,
        content: message.content,
        senderId: message.sender_id,
        senderName: message.sender_name || `用户${message.sender_id}`,
        senderRole: message.sender_role || '参与者',
        sentAt: message.sent_at,
        formattedTime: formatMessageTime(message.sent_at)
      }));

      console.log('当前用户ID:', user.u_id, '类型:', typeof user.u_id);
      console.log('消息列表:', formattedMessages.map(m => ({ 
        id: m.id, 
        senderId: m.senderId, 
        senderName: m.senderName,
        senderIdType: typeof m.senderId,
        isOwn: parseInt(m.senderId) === parseInt(user.u_id)
      })));

      setMessages(formattedMessages);
      
      // 加载消息后滚动到底部
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (err) {
      console.error('获取消息列表出错:', err);
      const errorMsg = err.message || '加载消息失败，请稍后重试';
      setError(errorMsg);
      
      if (err.message.includes('用户未认证') || err.message.includes('无法获取用户信息')) {
        await AsyncStorage.clear();
        navigation.navigate('home');
      }
    } finally {
      setLoading(false);
    }
  }, [groupId, navigation, currentUser]);

  // 给后端发消息数据
  const sendMessage = async () => {
    if (!inputMessage.trim()) {
      Alert.alert('提示', '请输入消息内容');
      return;
    }

    setSending(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('错误', '用户未认证，请重新登录');
        await AsyncStorage.clear();
        navigation.navigate('home');
        return;
      }

      const response = await fetch(`${BASE_URL}/groups/${groupId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: inputMessage.trim()
        }),
      });

      if (response.ok) {
        setInputMessage('');
        // 发送后刷新数据
        await fetchMessages();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || '发送消息失败');
      }
    } catch (err) {
      console.error('发送消息出错:', err);
      Alert.alert('错误', err.message || '发送消息失败，请重试');
      
      if (err.message.includes('用户未认证')) {
        await AsyncStorage.clear();
        navigation.navigate('home');
      }
    } finally {
      setSending(false);
    }
  };

  // 初始化屏幕
  useEffect(() => {
    const initializeScreen = async () => {
      const user = await getCurrentUser();
      console.log('初始化屏幕时获取的用户信息:', user);
      // 等待用户信息设置完成后再获取消息
      if (user) {
        setTimeout(() => {
          fetchMessages();
        }, 100);
      }
    };
    
    initializeScreen();
  }, []);

  // 设置返回导航
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: groupName || '群聊',
      headerTitleAlign: 'left',
      headerStyle: {
        elevation: 0, 
        shadowOpacity: 0,
        backgroundColor: '#fff',
      },
      headerTitleStyle: {
        fontSize: 16,
        color: '#333',
      },
      headerLeft: () => (
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Image source={require('../assets/Icon-back.png')} style={styles.backicon} />
        </TouchableOpacity>
        
      ),
    });
  }, [navigation, groupName, onlineMembers]);

  // 加载状态
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6c5ce7" />
            <Text style={styles.loadingText}>消息加载中...</Text>
     </View>
    );
  }

  // 报错状态
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>错误: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchMessages}>
          <Text style={styles.retryButtonText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? (
          <View style={styles.noMessagesContainer}>
            <Text style={styles.noMessagesText}>暂无消息，开始聊天吧！</Text>
          </View>
        ) : (
          messages.map((message) => {
            const isOwnMessage = currentUser &&  (message.senderId) === (currentUser.u_id);
            
            console.log(`消息 ${message.id}: senderId=${message.senderId}(${typeof message.senderId}), currentUserId=${currentUser?.u_id}(${typeof currentUser?.u_id}), isOwnMessage=${isOwnMessage}`);
            
            return (
              <View key={message.id} style={styles.messageWrapper}>
                {/* 其他人的消息 - 左侧布局 */}
                {!isOwnMessage && (
                  <View style={styles.otherMessageContainer}>
                    <Image
                      source={require('../assets/icon-sidebar-profile.png')}
                      style={styles.avatarSmall}
                    />
                    <View style={styles.otherMessageContent}>
                      <View style={styles.messageHeader}>
                        <Text style={styles.senderName}>
                          {message.senderName}
                          {message.senderRole === '发起人' && (
                            <Text style={styles.roleTag}> [发起人]</Text>
                          )}
                        </Text>
                      </View>
                      <View style={styles.otherMessageBubble}>
                        <Text style={styles.otherMessageText}>
                          {message.content}
                        </Text>
                      </View>
                      <Text style={styles.otherMessageTime}>
                        {message.formattedTime}
                      </Text>
                    </View>
                  </View>
                )}

                {/* 自己的消息 - 右侧布局 */}
                {isOwnMessage && (
                  <View style={styles.ownMessageContainer}>
                    <View style={styles.ownMessageContent}>
                      <View style={styles.messageHeader}>
                        <Text style={styles.ownSenderName}>
                          {message.senderName}
                          {message.senderRole === '发起人' && (
                            <Text style={styles.roleTag}> [发起人]</Text>
                          )}
                        </Text>
                      </View>
                      <View style={styles.ownMessageBubble}>
                        <Text style={styles.ownMessageText}>
                          {message.content}
                        </Text>
                      </View>
                      <Text style={styles.ownMessageTime}>
                        {message.formattedTime}
                      </Text>
                    </View>
                    <Image
                      source={require('../assets/icon-sidebar-profile.png')}
                      style={styles.avatarSmall}
                    />
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* I输入区域 */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputMessage}
          onChangeText={setInputMessage}
          placeholder="输入消息..."
          placeholderTextColor="#e0e0e0"
          multiline
          maxLength={500}
          editable={!sending}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputMessage.trim() || sending) 
          ]}
          onPress={sendMessage}
          disabled={!inputMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Image
              source={
                !inputMessage.trim() 
                  ? require('../assets/icon-send-no.png')
                  : require('../assets/icon-send-active.png')
              }
              style={styles.sendIcon}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
   loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', // 背景色
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#877EF2',
    padding: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  backButton: {
    marginLeft: 2,
    color: '#fff',
  },
  backicon: {
    width: 24,
    height: 24,
    marginLeft:10,
    marginRight:5,
  },
  backButtonText: {
    fontSize: 24,
    color: '#007bff',
    fontWeight: 'bold',
  },
  headerRightText: {
    fontSize: 14,
    color: '#666',
    marginRight: 15,
    fontWeight: '500',
    marginBottom: 5,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messagesContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  noMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noMessagesText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  messageWrapper: {
    marginVertical: 4,
  },
  // 其他人的消息样式 - 左侧布局
  otherMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  otherMessageContent: {
    marginLeft: 8,
    flex: 1,
  },
  otherMessageBubble: {
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    alignSelf: 'flex-start',  // 添加这行让气泡宽度适应内容
  },
  otherMessageText: {
    fontSize: 16,
    lineHeight: 20,
    color: '#50565A',
  },
  otherMessageTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'left',
  },
  // 自己的消息样式 - 右侧布局
  ownMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  ownMessageContent: {
    marginRight: 8,
    flex: 1,
    alignItems: 'flex-end',
  },
  ownMessageBubble: {
    backgroundColor: '#877EF2', // 淡绿色背景
    padding: 12,
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  ownMessageText: {
    fontSize: 16,
    lineHeight: 20,
    color: '#fff',
  },
  ownMessageTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  // 通用样式
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageHeader: {
    marginBottom: 4,
  },
  senderName: {
    fontSize: 14,
    color: '#808080',
  },
  ownSenderName: {
    fontSize: 14,
    color: '#808080',
    textAlign: 'right',
  },
  roleTag: {
    fontSize: 12,
    color: '#877EF2',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    shadowColor: "#ccc",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10, // Android 阴影效果
    marginBottom: 10,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
    backgroundColor: '#f9f9f9',
    marginBottom: 10,
  },
  sendButton: {
    borderRadius: 18,
    width: 36, 
    height: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sendIcon: {
    width: 36,
    height: 36,
    marginBottom: 10,
  },
});

export default GroupChatScreen;