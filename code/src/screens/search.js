import React, {useState, useEffect, useCallback} from 'react';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import {
  View,
  TextInput,
  StyleSheet,
  Image,
  Dimensions,
  FlatList,
  Text,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import BASE_URL from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const {width} = Dimensions.get('window');

const SearchScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const {type, userLocation, onSelectLocation} = route.params;

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [history, setHistory] = useState([]); // 历史记录列表
  const [favorites, setFavorites] = useState([]); // 常用地点列表

  const [selectedItemType, setSelectedItemType] = useState(null); // "history" 或 "favorite"
  const [modalVisible, setModalVisible] = useState(false); // 控制 Modal 显示
  const [selectedItem, setSelectedItem] = useState(null); // 当前选中的历史记录项
  const [modalPosition, setModalPosition] = useState({x: 0, y: 0}); // 记录 Modal 的位置

  // 加载历史记录
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const storedHistory = await AsyncStorage.getItem('history');
        if (storedHistory) {
          const parsedHistory = JSON.parse(storedHistory);
          setHistory(parsedHistory.filter(item => item && item.id)); // 过滤无效项
        } else {
          setHistory(JSON.parse([]));
        }
      } catch (error) {
        console.error('加载历史记录失败:', error);
        setHistory(JSON.parse([]));
      }
    };

    loadHistory();
  }, []);

  // 更新常用地点
  useFocusEffect(
    useCallback(() => {
      fetchFavorites();
    }, []),
  );

  // 获取当前用户的常用地点
  const fetchFavorites = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('未登录', '请先登录以使用完整功能');
        return;
      }

      const response = await fetch(`${BASE_URL}/users/getFavAddress`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFavorites(data); // 设置常用地点列表
      } else {
        console.error(
          '获取常用地点失败:',
          response.status,
          await response.text(),
        );
      }
    } catch (error) {
      console.error('请求失败:', error);
      Alert.alert('网络错误', '无法获取常用地点，请检查网络连接。');
    }
  };

  // 获取搜索建议
  const fetchSuggestions = useCallback(
    async currentQuery => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          Alert.alert('未登录', '请先登录以使用完整功能');
          setSuggestions([]);
          return;
        }

        if (
          !userLocation ||
          userLocation.latitude === undefined ||
          userLocation.longitude === undefined ||
          !currentQuery
        ) {
          console.error('无效的输入数据:', {userLocation, currentQuery});
          return;
        }

        const response = await fetch(`${BASE_URL}/search/AutoComplete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            keyword: currentQuery,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setSuggestions(data);
        } else {
          console.error(
            '获取建议失败:',
            response.status,
            await response.text(),
          );
          setSuggestions([]);
        }
      } catch (error) {
        console.log('请求建议出错:', error);
        setSuggestions([]);
        Alert.alert('网络错误', '无法获取搜索建议，请检查网络连接。');
      }
    },
    [userLocation],
  );

  // 添加常用地点
  const addToFavorites = async item => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('未登录', '请先登录以使用完整功能');
        return;
      }

      const response = await fetch(`${BASE_URL}/users/addFavAddress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: item.name,
          address: item.address || item.district,
          location: item.location,
          poi_id: item.id,
        }),
      });

      if (response.ok) {
        fetchFavorites();
        Alert.alert('成功', '已添加到常用地点');
      } else {
        console.error(
          '添加常用地点失败:',
          response.status,
          await response.text(),
        );
        Alert.alert('失败', '添加常用地点失败，请稍后再试。');
      }
    } catch (error) {
      console.error('请求失败:', error);
      Alert.alert('网络错误', '无法添加常用地点，请检查网络连接。');
    }
  };

  // 移除常用地点
  const deleteFavorite = async item => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('未登录', '请先登录以使用完整功能');
        return;
      }

      const response = await fetch(`${BASE_URL}/users/deleteFavAddress`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({poi_id: item.poi_id}), // 根据 poi_id 删除记录
      });

      if (response.ok) {
        Alert.alert('成功', '已移除常用地点');
        fetchFavorites(); // 删除成功后刷新常用地点列表
      } else {
        console.error(
          '移除常用地点失败:',
          response.status,
          await response.text(),
        );
        Alert.alert('失败', '移除常用地点失败，请稍后再试。');
      }
    } catch (error) {
      console.error('请求失败:', error);
      Alert.alert('网络错误', '无法移除常用地点，请检查网络连接。');
    }
  };

  // 搜索防抖处理
  useEffect(() => {
    const handler = setTimeout(() => {
      if (query.trim() === '') {
        setSuggestions([]);
        return;
      }
      fetchSuggestions(query);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [query, fetchSuggestions]);

  // 选择地点列表项返回前页
  const handleSelectSuggestion = item => {
    console.log(item);
    // 更新历史记录
    setHistory(prevHistory => {
      const existingIndex = prevHistory.findIndex(
        historyItem => historyItem.id === item.id,
      );

      let updatedHistory;
      if (existingIndex !== -1) {
        // 如果记录已存在，将其移到顶部
        const existingItem = prevHistory[existingIndex];
        updatedHistory = [
          existingItem,
          ...prevHistory.filter((_, index) => index !== existingIndex),
        ];
      } else {
        // 如果记录不存在，添加到顶部并限制为 10 条
        updatedHistory = [item, ...prevHistory].slice(0, 10);
      }

      // 保存到 AsyncStorage
      AsyncStorage.setItem('history', JSON.stringify(updatedHistory)).catch(
        error => console.error('保存历史记录失败:', error),
      );

      return updatedHistory;
    });

    if (onSelectLocation) {
      onSelectLocation({type, location: item});
    }
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Image
          source={require('../assets/icon-search.png')}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="查找地点"
          placeholderTextColor={'#BDBCBC'}
          autoCapitalize="none"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {/* 搜索栏为空时显示常用地点和历史记录 */}
      {query.trim() === '' && (
        <>
          <View style={styles.favoritesContainer}>
            <FlatList
              data={favorites}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({item}) => {
                if (!item) {
                  return null;
                }
                return (
                  <TouchableOpacity
                    style={styles.suggestionItem}
                    onPress={() => handleSelectSuggestion(item)}>
                    <View style={styles.suggestionContent}>
                      <Image
                        source={require('../assets/icon-fav.png')}
                        style={[
                          styles.suggestionIcon,
                          {backgroundColor: '#E0E0E0'},
                        ]}
                      />
                      <View style={styles.suggestionTextContainer}>
                        <Text style={styles.suggestionText}>{item.name}</Text>
                        <Text style={styles.suggestionSubText}>
                          {item.address || item.district}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={[styles.suggestionsList, {flexGrow: 1}]} // 确保占满空间
            />
          </View>

          <View style={styles.historyContainer}>
            <Text style={styles.historyTitle}>历史记录</Text>
            <FlatList
              data={history}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({item}) => {
                if (!item) {
                  return null;
                }
                return (
                  <TouchableOpacity
                    style={styles.suggestionItem}
                    onPress={() => handleSelectSuggestion(item)}>
                    <View style={styles.suggestionContent}>
                      <Image
                        source={require('../assets/icon-location.png')}
                        style={[
                          styles.suggestionIcon,
                          {backgroundColor: '#E0E0E0'},
                        ]}
                      />
                      <View style={styles.suggestionTextContainer}>
                        <Text style={styles.suggestionText}>{item.name}</Text>
                        <Text style={styles.suggestionSubText}>
                          {item.address || item.district}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={event => {
                          setSelectedItem(item); // 设置当前选中的项
                          setSelectedItemType('history'); // 设置来源为历史记录
                          const {pageX, pageY} = event.nativeEvent; // 获取点击位置
                          setModalPosition({x: pageX, y: pageY}); // 设置 Modal 的位置
                          setModalVisible(true); // 打开 Modal
                        }}>
                        <Image
                          source={require('../assets/icon-more.png')}
                          style={styles.moreIcon}
                        />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>暂无历史记录</Text>
              }
              contentContainerStyle={styles.suggestionsList}
            />
          </View>
        </>
      )}

      {/* 搜索栏有内容时显示搜索提示 */}
      {query.trim() !== '' && (
        <FlatList
          data={suggestions}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({item}) => (
            <TouchableOpacity
              style={styles.suggestionItem}
              onPress={() => handleSelectSuggestion(item)}>
              <View style={styles.suggestionContent}>
                <Image
                  source={require('../assets/icon-location.png')}
                  style={[styles.suggestionIcon, {backgroundColor: '#E0E0E0'}]}
                />
                <View style={styles.suggestionTextContainer}>
                  <Text style={styles.suggestionText}>{item.name}</Text>
                  <Text style={styles.suggestionSubText}>
                    {item.address || item.district}
                  </Text>
                </View>
                <Image
                  source={require('../assets/icon-more.png')}
                  style={styles.moreIcon}
                />
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>暂无搜索建议</Text>
          }
          contentContainerStyle={styles.suggestionsList}
        />
      )}

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={() => setModalVisible(false)} // 点击外部关闭 Modal
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)} // 点击背景关闭 Modal
        >
          <View
            style={[
              styles.modalContent,
              {top: modalPosition.y - 20, left: modalPosition.x - 120}, // 动态设置位置
            ]}>
            {selectedItemType === 'history' && (
              <>
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    if (selectedItem) {
                      addToFavorites(selectedItem); // 添加到常用
                    }
                    setModalVisible(false); // 关闭 Modal
                  }}>
                  <Text style={styles.modalOptionText}>设为常用</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    if (selectedItem) {
                      setHistory(prevHistory =>
                        prevHistory.filter(
                          historyItem => historyItem.id !== selectedItem.id,
                        ),
                      ); // 从历史记录中删除
                      AsyncStorage.setItem(
                        'history',
                        JSON.stringify(
                          history.filter(
                            historyItem => historyItem.id !== selectedItem.id,
                          ),
                        ),
                      ).catch(error => console.error('删除记录失败:', error));
                    }
                    setModalVisible(false); // 关闭 Modal
                  }}>
                  <Text style={[styles.modalOptionText, {color: '#FA8675'}]}>
                    删除记录
                  </Text>
                </TouchableOpacity>
              </>
            )}
            {selectedItemType === 'favorite' && (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  if (selectedItem) {
                    deleteFavorite(selectedItem); // 调用删除常用地点的函数
                  }
                  setModalVisible(false); // 关闭 Modal
                }}>
                <Text style={[styles.modalOptionText, {color: '#FA8675'}]}>
                  移除常用
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: width * 0.9,
    height: 50,
    borderWidth: 1,
    borderColor: '#C1C6CC',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    marginTop: 10,
  },
  searchIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
    tintColor: '#50565A',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#50565A',
  },
  favoritesContainer: {
    width: width * 0.9,
  },
  favoritesTitle: {
    fontSize: 16,
    color: '#383838',
    marginBottom: 10,
  },
  historyContainer: {
    width: width * 0.9,
    marginTop: 20,
  },
  historyTitle: {
    fontSize: 16,
    color: '#383838',
  },
  historyItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  historyText: {
    fontSize: 14,
    color: '#50565A',
  },
  emptyText: {
    fontSize: 12,
    color: '#A0A0A0',
    textAlign: 'center',
    marginTop: 10,
  },
  suggestionsList: {
    width: width * 0.9,
    marginTop: 10,
  },
  suggestionItem: {
    width: width * 0.9,
    paddingVertical: 10,
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionIcon: {
    width: 35,
    height: 35,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionText: {
    fontSize: 16,
    color: '#50565A',
  },
  suggestionSubText: {
    fontSize: 12,
    color: '#A0A0A0',
    marginTop: 2,
  },
  moreIcon: {
    width: 20,
    height: 20,
    tintColor: '#50565A',
  },
  modalOverlay: {
    flex: 1,
  },
  modalContent: {
    position: 'absolute',
    width: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#808080',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
    alignItems: 'center',
  },
  modalOption: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  modalOptionText: {
    fontSize: 14,
    color: '#363636',
  },
});

export default SearchScreen;
