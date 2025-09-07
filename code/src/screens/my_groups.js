import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../../config';


const MyGroupsScreen = () => {
  const navigation = useNavigation();
  const iconRefs = useRef({});

  const [groups, setGroups] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'N/A'; 

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); 
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };


  // 从后端获取群组数据
  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) { // 只检查token即可
        throw new Error('用户未认证或会话已过期，请重新登录。');
      }

      const response = await fetch(`${BASE_URL}/groups/my`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      // 检查响应状态
      if (!response.ok) {
        let errorMessage = `请求失败，状态码: ${response.status}`;
        try {
          const errorData = await response.text();
          if (errorData) {
            try {
              const parsedError = JSON.parse(errorData);
              errorMessage += ` - ${parsedError.message || JSON.stringify(parsedError).substring(0, 100)}`;
            } catch (e) {
              errorMessage += ` - ${errorData.substring(0, 100)}`; // Fallback to raw text
            }
          }
        } catch (e) {
          console.log('无法读取错误响应体', e);
        }
        throw new Error(errorMessage);
      }

      // 检查响应是否为JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error('响应不是 JSON 格式:', responseText.substring(0, 200));
        throw new Error('服务器返回了非 JSON 格式的响应');
      }

      const rawData = await response.json();

      // 根据数据库结构格式化群组数据
      const formattedGroups = rawData.map(group => ({
        id: group.id, // chats 表的自增ID
        name: group.name, // chats 表的群聊名称
        memberCount: group.member_cnt, // chats 表的成员总数
        onlineCount: group.online_cnt, // chats 表的在线人数
        // 使用 joined_time 字段（来自 chatMembers 表）
        date: formatDate(group.joined_time), // Using native Date formatting
        // 添加角色信息
        role: group.role || '参与者' // chatMembers 表的角色
      }));

      setGroups(formattedGroups);
    } catch (err) {
      console.error('获取群组列表出错:', err); 
      const errorMsg = err.message || '加载群组列表失败，请稍后重试';
      setError(errorMsg);
      Alert.alert('错误', errorMsg);
      if (err.message.includes('用户未认证') || err.message.includes('会话已过期')) {
        await AsyncStorage.clear();
        navigation.navigate('home'); 
      }
    } finally {
      setLoading(false);
    }
  }, [navigation]); 

  // 当屏幕获得焦点时重新获取数据
  useFocusEffect(
    useCallback(() => {
      fetchGroups();
      return () => {};
    }, [fetchGroups])
  );

  // 打开群聊选项菜单
  const openGroupOptions = (group, groupId, event) => {
    setSelectedGroup(group);

    const iconRef = iconRefs.current[groupId];
    if (iconRef) {
      iconRef.measure((fx, fy, width, height, px, py) => {
        setPopupPosition({
          x: px - 100, 
          y: py + height, 
        });
        setModalVisible(true);
      });
    }
  };

  // 清空聊天记录
  const clearHistory = async () => {
    setModalVisible(false);
    if (!selectedGroup) return;

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('错误', '用户未认证，请重新登录');
        await AsyncStorage.clear();
        navigation.navigate('Login');
        return;
      }

      const response = await fetch(`${BASE_URL}/groups/${selectedGroup.id}/clearHistory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        Alert.alert('成功', `已清空群聊 ${selectedGroup.name} 的聊天记录`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || '清空记录失败');
      }
    } catch (err) {
      console.error('清空记录出错:', err);
      Alert.alert('错误', err.message || '清空记录失败，请重试');
      if (err.message.includes('用户未认证')) {
        await AsyncStorage.clear();
        navigation.navigate('Login');
      }
    }
  };

  // 退出群聊
  const leaveGroup = async () => {
    setModalVisible(false);
    if (!selectedGroup) return;

    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        Alert.alert('错误', '用户未认证，请重新登录');
        await AsyncStorage.clear();
        navigation.navigate('Login');
        return;
      }

      const response = await fetch(`${BASE_URL}/groups/${selectedGroup.id}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        Alert.alert('成功', `您已退出群聊：${selectedGroup.name}`);
        // 成功退出后，从列表中移除该群组
        setGroups(groups.filter(g => g.id !== selectedGroup.id));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || '退出群聊失败');
      }
    } catch (err) {
      console.error('退出群聊出错:', err);
      Alert.alert('错误', err.message || '退出群聊失败，请重试');
      if (err.message.includes('用户未认证')) {
        await AsyncStorage.clear();
        navigation.navigate('Login');
      }
    }
  };

  // 加载状态
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6c5ce7" />
          <Text style={styles.loadingText}>正在获取位置信息...</Text>
      </View>
    );
  }

  // 错误状态
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>出错啦！ {error}</Text>
        <Text style={styles.debugText}>
          请检查网络连接和服务器状态。如果提示“用户未认证”，请尝试重新登录。
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchGroups}>
          <Text style={styles.retryButtonText}>重试</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.debugButton}
          onPress={() => {
            Alert.alert(
              '调试信息',
              `API 端点: ${BASE_URL}/groups/my\n请确认后端服务正常运行。\n当前错误: ${error}`
            );
          }}
        >
          <Text style={styles.debugButtonText}>查看调试信息</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 无群组状态
  if (groups.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noGroupsText}>未找到任何群组。加入或创建一个群组吧！</Text>
        {/* 如果有创建群组的功能，这里可以添加按钮 */}
        {/* <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateGroup')}
        >
          <Text style={styles.createButtonText}>创建群组</Text>
        </TouchableOpacity> */}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 页面头部 */}
        <View style={styles.headerCurtain}>
            <TouchableOpacity
                style={styles.backButtonContainer}
                onPress={() =>
                  navigation.goBack()
                }
              >
                <Image
                  source={require('../assets/Icon-back.png')} 
                  style={styles.backArrowIcon}
                />
                <Text style={styles.headerTitle}>我的群聊</Text>
              </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {groups.map((group) => (
          <TouchableOpacity
            key={group.id}
            style={styles.groupCard}
            onPress={() => navigation.navigate('GroupChat', {
              groupId: group.id,
              groupName: group.name,
              onlineMembers: group.onlineCount
            })}
          >
            <Image
              source={require('../assets/chat-logo.png')}
              style={styles.groupIcon}
            />
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>{group.name}</Text>
              <Text style={styles.groupRole}>
                {group.role === '发起人' ? '发起人' : '参与者'}
              </Text>
              <Text style={styles.groupDate}>加入时间: {group.date}</Text>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={[styles.groupMembers]}>
                  {group.memberCount} 位成员
                </Text>
                <Text style={{color: '#999'}}> • </Text>
                <Text style={[styles.groupMembers, {color: '#34DFDD'}]}>
                  {group.onlineCount} 位在线
                </Text>
              </View>
            </View>
            <TouchableOpacity
              ref={el => iconRefs.current[group.id] = el}
              style={styles.moreIconContainer}
              onPress={(e) => {
                e.stopPropagation();
                openGroupOptions(group, group.id, e);
              }}
            >
              <Image source={require('../assets/icon-more.png')} style={styles.moreIcon} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 群聊选项弹出框 */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={[styles.popupContainer, { top: popupPosition.y, left: popupPosition.x }]}>
          <TouchableOpacity
            style={[styles.popupButton, styles.borderBottom]}
            onPress={clearHistory}
          >
            <Text style={styles.popupButtonText}>清空记录</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.popupButton}
            onPress={leaveGroup}
          >
            <Text style={[styles.popupButtonText, styles.dangerText]}>退出群聊</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerCurtain: {
    backgroundColor: '#ffffff', 
    height: 75,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    justifyContent: 'space-between'
  },
  backButtonContainer: {
      flexDirection: 'row', 
      alignItems: 'center', 
  },
  backArrowIcon: {
      width: 22, 
      height: 22,
      resizeMode: 'contain',
      tintColor: '#333', 
      marginRight: 8, 
  },
  headerTitle: {
      fontSize: 17, 
      fontWeight: '600', 
      color: '#333',
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
    backgroundColor: '#fff',
  },
  errorText: {
    color: '#FC6752',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  debugText: {
    color: '#666',
    fontSize: 14,
    marginTop: 10,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#877EF2',
    padding: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  debugButton: {
    borderWidth: 1,
    borderColor: '#E1E1E1',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  debugButtonText: {
    color: '#E1E1E1',
    fontSize: 14,
  },
  noGroupsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    minWidth: 180,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    marginTop: 30,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal:24,
    marginBottom: 16,
    shadowColor: '#ccc',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 10,
    position: 'relative',
  },
  groupIcon: {
    width: 48,
    height: 48,
    marginRight: 16,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  groupRole: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#877EF2',
    marginBottom: 4,
  },
  groupDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  groupMembers: {
    fontSize: 14,
    color: '#999',
  },
  moreIconContainer: {
    padding: 8,
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  moreIcon: {
    width: 24,
    height: 24,
    tintColor: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  popupContainer: {
    position: 'absolute',
    width: 160,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
  },
  popupButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  popupButtonText: {
    fontSize: 16,
    color: '#333',
  },
  dangerText: {
    color: '#FC6752',
  },
});

export default MyGroupsScreen;