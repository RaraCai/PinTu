import React, { useState, useEffect, act } from'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  Modal,
  TextInput,
} from'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../../config';


const {width,height} = Dimensions.get('window');

const SquareScreen = () => {
  const [activeTab, setActiveTab] = useState('可拼单'); // 当前激活的 Tab
  const tabs = ['可拼单', '已申请', '已发起']; // Tab 名称
  const route = useRoute();
  const { status = 'none', orders = [], passengerCnt =  1 } = route.params || {};  // 获取从home界面传递来的订单匹配参数
  /* 全部订单tab */
  const [orderDetails, setOrderDetails] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // 新增加载状态
  /* 已申请tab */
  const [applyList, setApplyList] = useState([]); // 已申请订单列表
  const [isApplyLoading, setIsApplyLoading] = useState(false); // 新增加载状态
  /* 已发起tab */
  const [createList, setCreateList] = useState([]); // 已发起订单列表
  const [isCreateLoading, setIsCreateLoading] = useState(false); // 新增加载状态
  const navigation = useNavigation();
  const [showInputModal, setShowInputModal] = useState(false);    // 2次确认拼车人数弹窗
  const [inputPassengerCnt, setInputPassengerCnt] = useState(String(passengerCnt || 1));  // 最终确认的拼车人数
  const [selectedOrderId, setSelectedOrderId] = useState(null); // 选中的订单ID

  // 获取可拼单订单详情
  const fetchOrderDetails = async () => {
    try {
    // 获取token，本人发车的订单不在广场"可拼单"显示
        const token = await AsyncStorage.getItem('token');
        const response = await fetch(`${BASE_URL}/orders/fetch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            status,
            orders
          })
        });

        if (response.ok) {
          const data = await response.json();
          setOrderDetails(data.order_details);
        } else {
          console.error('请求失败:', response.statusText);
          Alert.alert('请求失败', response.statusText); // 弹出错误提示
        }
      } catch (error) {
        console.error('请求出错:', error);
        Alert.alert('请求出错', error.message); // 弹出错误提示
      } finally {
        setIsLoading(false); // 请求完成，无论成功或失败，都将加载状态设为 false
        console.log('isLoading 设置为 false'); // 检查 isLoading 是否正确更新
      }
    };

  // 获取已申请订单列表
  const fetchAppliedOrders = async () => {
    setIsApplyLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/orders/fetch_applied`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('已申请订单数据:', data.applied_orders); // 打印获取的已申请订单数据
        setApplyList(data.applied_orders);
      } else {
        console.error('请求失败:', response.statusText);
        Alert.alert('请求失败', response.statusText); // 弹出错误提示
      }
    } catch (error) {
      console.error('请求出错:', error);
      Alert.alert('请求出错', error.message); // 弹出错误提示
    } finally {
      setIsApplyLoading(false); // 请求完成，无论成功或失败，都将加载状态设为 false
    }
  };

  // 获取已发起订单列表
  const fetchCreatedOrders = async () => {
    setIsCreateLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/orders/fetch_created`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCreateList(data.created_orders);
      } else {
        console.error('请求失败:', response.statusText);
        Alert.alert('请求失败', response.statusText); // 弹出错误提示
      }
    } catch (error) {
      console.error('请求出错:', error);
      Alert.alert('请求出错', error.message); // 弹出错误提示
    } finally {
      setIsCreateLoading(false); // 请求完成，无论成功或失败，都将加载状态设为 false
    }
  };
  
  useEffect(() => {
    if (activeTab === '可拼单') {
      fetchOrderDetails();
    } else if (activeTab === '已申请') {
      fetchAppliedOrders();
    } else if (activeTab === '已发起') {
      fetchCreatedOrders();
    }

  }, [activeTab]);

  // 确认回调：乘客申请拼车
  const handleConfirmCarpool = async(order_id) =>{
    console.log('乘客申请拼车:', order_id);
      // 获取token
      let token;
      try{
          token=await AsyncStorage.getItem('token');
      }catch(error){
          Alert.alert('错误', '请重新登陆以进行其他操作');
          navigation.navigate('Login');
          return;
      }
      // 向后端发送申请拼车请求
      try{
          const response = await fetch(`${BASE_URL}/orders/apply/${order_id}`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
            },
              body: JSON.stringify({
                passengerCnt: inputPassengerCnt,
              }),
          });
          if (response.ok){
              const data = await response.json();
              if (data.status === 'success'){
                Alert.alert('申请成功', '拼车申请已发送，请等待发车人确认~');
              }
              else if (data.status === 'repeated') {
                  Alert.alert('请勿重复申请', '您已经申请过此订单啦，请耐心等待发车人确认哦');
              }
              else if (data.status === 'same') {
                  Alert.alert('提示', '您无需申请自己发车的订单，耐心等待其他乘客申请吧~');
              }
              setShowInputModal(false);
            } 
          else{
              Alert.alert('错误', '拼车申请失败，请稍后再试');
          }
        }
        catch(error){
            Alert.alert('网络错误', '拼车申请请求体发送失败，请稍后再试');
        }
    };

  // 复用订单列表项
  const renderListItem = ({ item }) => (
    <View style={styles.listItemContainer}>
      {/* --- 顶部: 用户/司机信息 (占位符) --- */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile', { view: 'others', u_id: item.driver_id })} // 点击头像跳转到个人中心
        >
          <Image
            source={require('../assets/avatar.png')} // TODO: 待个人中心完成，改头像
            style={styles.avatar}
          />
        </TouchableOpacity>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.driver_name}</Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>★{item.driver_stars}</Text>
            <Text style={styles.ratingCountText}>({item.driver_total})</Text>
          </View>
        </View>
      </View>

      {/* --- 路线信息 --- */}
      <View style={{marginLeft: 10, marginRight: 10}}>
        <Text style={styles.dateText}>{item.date}</Text>
        <Text style={styles.routeText} numberOfLines={2} ellipsizeMode="tail">
          从 <Text style={styles.locationHighlight}>{item.origination || '起点'}</Text>{' '}
          到 <Text style={styles.locationHighlight}>{item.destination || '终点'}</Text>
        </Text>
      </View>


      {/* --- 详情部分 --- */}
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Image
              source={require('../assets/Icon_Clock.png')} 
              style={styles.infoIcon}
            />
            <Text style={styles.infoText}>{item.time}</Text>
          </View>
          <Text style={styles.infoLabel}>发车时间</Text>
        </View>

        <View style={styles.infoItem}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Image
              source={require('../assets/Icon_Chat.png')} 
              style={styles.infoIcon}
            />
            <Text style={styles.infoText}>{item.driver_punctualRate}%</Text>
          </View>
          <Text style={styles.infoLabel}>准时到达</Text>
        </View>

        <View style={styles.infoItem}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Image
              source={require('../assets/Icon_Money.png')} 
              style={styles.infoIcon}
            />
            <Text style={styles.infoText}>{item.cost}元</Text>
          </View>
          <Text style={styles.infoLabel}>人均价格</Text>
        </View>
      </View>

      {/* --- 操作按钮区域 --- */}
      <View style={styles.buttonRow}>
        {/* 查看路线按钮 */}
          <TouchableOpacity
            style={[styles.actionButtonBase, styles.routeButton]} // 应用基础和特定样式
            onPress={() => 
              navigation.navigate('SquareDetail',{order_id: item.order_id, passengerCnt: passengerCnt, type: 'route'})
            } 
          >
            <Text style={[styles.actionButtonTextBase, styles.routeButtonText]}>查看路线</Text>
          </TouchableOpacity>

        {/* 确认按钮 */}
        <LinearGradient
          colors={['rgba(153, 145, 246, 1)', 'rgba(117, 106, 237, 1)']}
          start={{x: 0.9928, y: 0.5072}}
          end={{x: 0.0072, y: 0.5072}}
          style={[styles.actionButtonBase, styles.confirmButton]}>
          <TouchableOpacity
            onPress={() => { 
              setShowInputModal(true);
              setSelectedOrderId(item.order_id); // 记录当前订单id
            }}
          >
            <Text style={[styles.actionButtonTextBase, styles.confirmButtonText]}>确认参与</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
      {/* 2次确认拼车人数弹窗 */}
      <Modal
          visible={showInputModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowInputModal(false)}
      >
          <View style={styles.pCntWrapper}>
              <View style={styles.pCntContainer}>
                  <Image
                      source={require('../assets/warning.png')}
                      style={styles.warningIcon}
                  />
                  <Text style={{fontSize:18, marginBottom:12, fontWeight: 500, color: '#383838'}}>订单人数确认</Text>
                  <Text style={{fontSize:14, marginBottom:12, color: '#50565A'}}>请再次确认本单拼车人数，本操作后订单将提交，不可修改~</Text>
                  <TextInput
                      style={styles.pCntInput}
                      keyboardType='numeric'
                      value={inputPassengerCnt}
                      onChangeText={setInputPassengerCnt}
                      placeholder="请确认拼车人数"
                  />
                  <View style={{flexDirection:'row',justifyContent:'space-between',width:'100%', gap:16 }}>
                      <TouchableOpacity style={styles.button} onPress={()=>setShowInputModal(false)}>
                          <Text style={styles.cancelButtonText}>取消</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.button} onPress={() => {handleConfirmCarpool(selectedOrderId)}}>
                          <Text style={styles.submitButtonText}>确认</Text>
                      </TouchableOpacity>
                  </View>
              </View>
            </View>
        </Modal>
    </View>
  );

  // 根据已申请订单状态改变文本颜色
  const getAppliedStatusStyle = (status) =>{
    switch (status) {
      case 'waiting':
        return { color: '#FF8D1A', text: '● 申请中' };
      case 'approved':
        return { color: '#43CF7C', text: '● 已通过' };
      case 'rejected':
        return { color: '#FF5733', text: '● 未通过' };
      case 'ended':
        return { color: '#A6A6A6', text: '● 已结束' };
    }
  };
  // 根据已创建订单状态改变文本颜色
  const getCreatedStatusStyle = (status) =>{
    switch (status) {
      case 'waiting':
        return { color: '#FF8D1A', text: '● 进行中' };
      case 'driving':
        return { color: '#43CF7C', text: '● 行驶中' };
      case 'ended':
        return { color: '#A6A6A6', text: '● 已结束' };
    }
  };

  // 复用已申请列表项
  const renderAppliedListItem = ({ item }) => {
    const statusStyle = getAppliedStatusStyle(item.status);
    return (
      <View style={styles.appliedListItemContainer}>
        {/* 时间 */}
        <Text style={{ fontSize: 16, color: '#222', fontWeight: 'bold', marginBottom: 8 }}>
          {item.date} {item.time}
        </Text>
        {/* 路线 */}
        <Text style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>
          从 <Text style={{ color: '#333', fontWeight: 'bold' }}>{item.origination}</Text>
          {' '}到 <Text style={{ color: '#333', fontWeight: 'bold' }}>{item.destination}</Text>
        </Text>
        {/* 订单状态和操作 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, minHeight: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' }} />
              <Text style={{ color: statusStyle.color, fontSize: 14, fontWeight: '500' }}>
                {statusStyle.text}
              </Text>
            </View>
          {/* 已通过的订单可以回到详情*/}
          {item.status === 'approved' && (
            <TouchableOpacity
              style={styles.listButton}  
              onPress={() => navigation.navigate('SquareDetail', { order_id: item.order_id, type: 'order' } )}
            >
              <Text style={{ color: '#6c5ce7', fontSize: 12, }}>查看详情</Text>
            </TouchableOpacity>
          )}
          {/* 已结束的订单可以填写评价 */}
          {item.status === 'ended' && (
            <TouchableOpacity
              style={styles.listButton}
              onPress={() => navigation.navigate('Review',{order_id: item.order_id})}
            >
              <Text style={{ color: '#6c5ce7', fontSize: 12, }}>填写评价</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // 复用已发起列表项
  const renderCreatedListItem = ({item}) => {
    const statusStyle = getCreatedStatusStyle(item.status);
    return(
      <View style={styles.appliedListItemContainer}>
        {/* 时间 */}
        <Text style={{ fontSize: 16, color: '#222', fontWeight: 'bold', marginBottom: 8 }}>
          {item.date} {item.time}
        </Text>
        {/* 路线 */}
        <Text style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>
          从 <Text style={{ color: '#333', fontWeight: 'bold' }}>{item.origination}</Text>
          {' '}到 <Text style={{ color: '#333', fontWeight: 'bold' }}>{item.destination}</Text>
        </Text>
        {/* 订单状态和操作 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, minHeight: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: statusStyle.bg }} />
              <Text style={{ color: statusStyle.color, fontSize: 14, fontWeight: '500' }}>
                {statusStyle.text}
              </Text>
            </View>
          {/* 已通过的订单可以回到详情*/}
          {( item.status === 'waiting' || item.status === 'driving' ) && (
            <TouchableOpacity
              style={styles.listButton}  
              onPress={() => navigation.navigate('SquareDetail', { order_id: item.order_id , type: 'order' })}
            >
              <Text style={{ color: '#6c5ce7', fontSize: 12, }}>查看详情</Text>
            </TouchableOpacity>
          )}
          {/* 已结束的订单可以填写评价 */}
          {item.status === 'ended' && (
            <TouchableOpacity
              style={styles.listButton}
              onPress={() => navigation.navigate('Review',{order_id: item.order_id})}
            >
              <Text style={{ color: '#6c5ce7', fontSize: 12 }}>填写评价</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };


  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[styles.tabText, activeTab === tab && styles.activeTabText]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {activeTab === '可拼单' &&(
        <View style={styles.listContainer}>
          {isLoading ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <ActivityIndicator size="large" color="#6c5ce7" />
              <Text style={styles.loadingText}>拼车订单正在路上...</Text>
            </View>
          ) : (
            <View>
              {status === 'best' && <Text style={{ color: '#aaa', textAlign: 'center', marginBottom: 5, fontSize: 12}}>-根据拼车请求，系统为您匹配到如下订单-</Text>}
              <FlatList
                data={orderDetails}
                renderItem={renderListItem}
                keyExtractor={(item, index) => index.toString()}
                ListEmptyComponent={() => (
                  <Text style={{ color: '#aaa', textAlign: 'center', marginBottom: 5, fontSize: 12 }}>-没有可显示的订单-</Text> // 添加空列表提示
                )}
              />
            </View>
          )}
        </View>
      )}
      
      {activeTab === '已申请' && (
        <View style={styles.listContainer}>
          {isApplyLoading ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <ActivityIndicator size="large" color="#6c5ce7" />
              <Text style={styles.loadingText}>正在加载已申请订单...</Text>
            </View>
          ) : (
            <FlatList
              data={applyList}
              renderItem={renderAppliedListItem}
              keyExtractor={(item, index) => index.toString()}
              ListEmptyComponent={() => (
                <Text style={{ color: '#aaa', textAlign: 'center', marginBottom: 5, fontSize: 12 }}>-您暂时没有已申请的订单-</Text>
              )}
            />
          )}
        </View>
      )}

      {activeTab === '已发起' && (
        <View style={styles.listContainer}>
          {isApplyLoading ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <ActivityIndicator size="large" color="#6c5ce7" />
              <Text style={styles.loadingText}>正在加载已发起订单...</Text>
            </View>
          ) : (
            <FlatList
              data={createList}
              renderItem={renderCreatedListItem}
              keyExtractor={(item, index) => index.toString()}
              ListEmptyComponent={() => (
                <Text style={{ color: '#aaa', textAlign: 'center', marginBottom: 5, fontSize: 12 }}>-您暂时没有已发起的订单-</Text>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  tabButton: {
    paddingVertical: 5,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#6c5ce7',
  },
  tabText: {
    fontSize: 16,
    color: '#888',
  },
  activeTabText: {
    color: '#6c5ce7',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 10,
    flex: 1,
  },
  listItemContainer: {
    width: width * 0.9,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    paddingBottom: 15,
    elevation: 10,
    shadowColor: '#979797',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.05,
    shadowRadius: 20,
    alignSelf: 'center',
    marginTop: 5,
    marginBottom: 5,
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#ffc107',
    paddingVertical: 5,
  },
  ratingCountText: {
    fontSize: 14,
    color: '#888',
    paddingLeft: 5,
    paddingVertical: 5,
  },
  dateText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
    fontWeight: 'bold',
  },
  routeText: {
    fontSize: 14,
    lineHeight: 24,
    color: '#808080',
    marginBottom: 6,
  },
  locationHighlight: {
    color: '#333',
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    marginBottom: 20,
    marginLeft: 10,
    marginRight: 10,
    width: '90%',
  },
  infoItem: {
    alignItems: 'center',
  },
  infoIcon: {
    width: 24,
    height: 24,
  },
  infoText: {
    marginLeft: 5,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 24,
    textAlignVertical: 'center' // 新增样式
  },
  infoLabel: {
    fontSize: 12,
    color: '#BDBCBC',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  viewRouteButton: {
    borderWidth: 1,
    borderColor: '#6c5ce7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  actionButtonBase: {
    // 按钮的基础样式
    flex: 1, // 让按钮平分宽度
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginHorizontal: 10, // 按钮之间的水平间距
  },
  routeButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#877EF2',
  },
  confirmButton: {
    // 确认按钮特定样式
    backgroundColor: '#6c5ce7', // 主题紫色背景
  },
  actionButtonTextBase: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  routeButtonText: {
    color: '#877EF2', 
  },
  confirmButtonText: {
    // 确认按钮文字颜色
    color: '#fff', // 白色文字
  },
  pCntWrapper: {
      flex:1,
      backgroundColor:'rgba(0,0,0,0.3)',
      justifyContent:'center',
      alignItems:'center',
  },
  pCntContainer:{
      backgroundColor:'#fff', // 白色卡片
      borderRadius:15,
      padding:24,
      width:350,
      alignItems:'center',
      elevation: 8, // 安卓阴影
      shadowColor: '#000', // iOS阴影
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
  },
  pCntInput:{
      borderWidth:1,
      borderColor:'#ccc',
      borderRadius:6,
      width:'100%',
      padding:8,
      marginBottom:16,
      textAlign:'center'
  },
  warningIcon:{
      width:72,
      height:72,
      marginBottom:16,
  },
  button: {
      backgroundColor:'#fff',
      borderRadius: 6,
      width: '45%',
      paddingVertical: 8,
      alignItems: 'center',
  },
  cancelButtonText: {
      color:'#BDBCBC',
      fontSize: 16,
  },
  submitButtonText: {
      color:'#877EF2',
      fontSize: 16,
  },
  appliedListItemContainer:{
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 10,
    shadowColor: '#979797',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 10,
  },
  listButton: {
    minWidth: 80,
    height: 30,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#6c5ce7',
    borderRadius: 16,
    marginLeft: 10,
    marginRight: 5,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row'
  },
});
export default SquareScreen;