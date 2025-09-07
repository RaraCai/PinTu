import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Modal,
    TextInput,
  } from 'react-native';

import MapScreen from './component/map'; // 导入地图组件
import RouteInfoDisplay from './component/RouteInfoDisplay'; // 导入路线信息展示组件
import OrderInfoDisplay from './component/OrderInfoDisplay'; // 导入订单信息展示组件
import OperationCard from './component/OperationCard';  //导入操作卡片组件
import { ScrollView } from 'react-native-gesture-handler';

import BASE_URL from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SquareDetail = ({navigation, route})=> {
    const { order_id, passengerCnt = 1, type = 'route' } = route.params;  // 获取页面跳转时的参数
    const [ orderDetails, setOrderDetails ] = useState(null);
    const [ routePlanningData, setRoutePlanningData] = useState(null);
    const [ loading, setLoading ] = useState(true);
    const mapRef = useRef(null);
    const [userLocation, setUserLocation] = useState(null);
    const [headerTitle, setHeaderTitle] = useState('');
    const [showInputModal, setShowInputModal] = useState(false);    // 2次确认拼车人数弹窗
    const [inputPassengerCnt, setInputPassengerCnt] = useState(String(passengerCnt || 1));  // 最终确认的拼车人数
    const [headerHeight, setHeaderHeight] = useState(0); // 页头高度

    // --- 定位逻辑 (保持不变) ---
    const requestLocation = useCallback(async () => {
        Geolocation.getCurrentPosition(
            position => {
            const currentPos = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            };
            console.log('定位成功:', currentPos);
            setUserLocation(currentPos);
            if (mapRef.current && !routePlanningData) {
                mapRef.current.moveCamera({target: currentPos, zoom: 14}, 300);
            }
            },
            error => {
            console.log('获取位置失败:', error.code, error.message);
            },
            {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
        );
    }, [routePlanningData]);

    useEffect(() => {
        requestLocation();
    }, [requestLocation]);

    // 页面挂载获取本订单详情
    useEffect(() => {
        fetchOrderDetails(order_id);
    },[order_id]);

    // 监听orderDetails，状态更新后调用路径规划
    useEffect(() =>{
        if(orderDetails){
            handleRoutePlanning(orderDetails);            
            if(type === 'route'){
                setHeaderTitle('查看路线');
            }
            else if (type === 'order'){
                if(orderDetails.order_status === 'driving' || orderDetails.order_status === 'waiting'){
                    setHeaderTitle('拼车进行中');
                }
                else if (orderDetails.order_status === 'ended'){
                    setHeaderTitle('拼车已结束');
                }
            }
        }
    },[orderDetails]);

    // 根据订单详情调用路径规划
    const handleRoutePlanning = async(order) => {
        // token 获取与验证
        let token;
        try {
        token = await AsyncStorage.getItem('token');
        if (!token) {
            Alert.alert('未登录', '请先登录后再进行操作');
            navigation.navigate('Login');
            return;
        }
        } catch (error) {
            console.error('获取 token 失败:', error);
            Alert.alert('操作失败', '无法获取登录状态，请稍后重试');
            return;
        }
        // 调用路径规划api
        const requestBody = {
            origin: orderDetails.origin_lnglat,
            destination: orderDetails.destination_lnglat,
            originID: orderDetails.origin_id,
            destinationID: orderDetails.destination_id
        };
        try{
            const response = await fetch(`${BASE_URL}/route_planning`, {
                method: 'POST',
                headers:{
                   'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`, 
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            if(response.ok){
                // 设置路径规划数据
                setRoutePlanningData(data);
                setLoading(false);
            }
            else {
                console.error('路径规划 API 请求失败:', response.status, responseBody);
                if (response.status === 401) {
                  Alert.alert('认证失败', '登录已过期或无效，请重新登录。');
                  await AsyncStorage.removeItem('token');
                  navigation.navigate('Login');
                } else if (response.status === 400) {
                  Alert.alert('请求错误', `路径规划失败，请检查起点和终点是否有效。(${responseBody})`);
                } else if (response.status === 404) {
                  Alert.alert('规划失败', '无法找到从起点到终点的有效路径。');
                } else {
                  Alert.alert('规划失败', `服务器错误 (${response.status})，请稍后重试。`);
                }
              }
        }catch (error) {
            console.error('路径规划网络请求出错:', error);
        }
    };

    // 后端获取订单详情
    const fetchOrderDetails = async(order_id) => {
        // 获取token
        let token;
        try{
            token=await AsyncStorage.getItem('token');
        }catch(error){
            Alert.alert('错误', '请重新登陆以进行其他操作');
            navigation.navigate('Login');
            return;
        }
        // 向后端请求该订单详情数据
        try{
            const response = await fetch(`${BASE_URL}/orders/${order_id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });

            const data = await response.json();
            
            if (response.ok){
                setOrderDetails(data.result);  // 设置订单详情
            }
            else{
                Alert.alert('错误', data.message || '获取订单路线详情失败');
            }
        } catch(error){
            Alert.alert('错误', '无法连接到服务器');
        }
    };

    // 取消回调
    const handleCancelRoutePlanning = () =>{
        setRoutePlanningData(null);
        setLoading(true);
        navigation.goBack();
    };

    // 确认回调：乘客申请拼车
    const handleConfirmCarpool = async() =>{
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
                    Alert.alert('请勿重复申请', '您已经申请过此订单啦，请耐心等待发车人确认哦~');
                }
                else if (data.status === 'same') {
                    Alert.alert('提示', '您无需申请自己发车的订单，耐心等待其他乘客申请吧~');
                }
                setShowInputModal(false); // 关闭弹窗
            } 
            else{
                Alert.alert('错误', '拼车申请失败，请稍后再试');
            }
        }
        catch(error){
            Alert.alert('网络错误', '拼车申请请求体发送失败，请稍后再试');
        }
        navigation.goBack();
    };

    // 跳转到本订单的群聊
    const handleNavigateToGroups = async()=> {
        try {
            const response = await fetch(`${BASE_URL}/groups/fetchByOrderId/${order_id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (response.ok){
                const data = await response.json();
                if (data.status === 'success') {
                    const group = data.group_detail;
                    // 跳转到对应的群聊页面
                    navigation.navigate('GroupChat', {
                        groupId: group.group_id,
                        groupName: group.group_name,
                        onlineMembers: group.group_online_cnt
                    })
                }
            }
            else{
                Alert.alert('错误', '群聊加载失败，请稍后再试');
            }
        }catch(error){
            Alert.alert('错误', '群聊加载失败，请稍后再试');
        }
    };

    if (loading){
        return (
            <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 , backgroundColor: '#fff'}}>
                <ActivityIndicator size="large" color="#6c5ce7" />
                <Text style={styles.loadingText}>获取订单路线详情中...</Text>
            </View>
        );
    }

    if (!orderDetails || !routePlanningData ){
        return(
            <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, backgroundColor: '#fff' }}>
                <Text style={styles.loadingText}>订单详情获取失败</Text>
            </View>
        );
    }

    return(
        <View style={{flex: 1, position: 'relative'}}>
            {/* 页头（标题文字依据订单状态改变） */}
            <View 
                style={styles.routeHeaderCurtain}
                onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)}
            >
                <TouchableOpacity
                    style={styles.backButtonContainer}
                    onPress={() => navigation.goBack()} // 点击返回按钮返回上层界面
                >
                    <Image
                        source={require('../assets/Icon-back.png')} 
                        style={styles.backArrowIcon}
                    />
                    <Text style={styles.headerTitle}>{headerTitle}</Text>
                </TouchableOpacity>
                {headerTitle === '拼车进行中' && (
                    <TouchableOpacity 
                        onPress={handleNavigateToGroups}
                    >
                        <Image
                            source={require('../assets/icon-purple-group.png')}
                            style={styles.buttonIcon}
                        />
                    </TouchableOpacity>
                )}
            </View> 
            {headerTitle === '拼车进行中' && (
                <OrderInfoDisplay
                    order={orderDetails}
                    style = {{
                        position: 'absolute',
                        top: headerHeight,
                        left: 0,
                        right: 0,
                        zIndex: 5,
                    }}
                />
            )}


            <ScrollView
                contentContainerStyle={[
                    styles.scrollViewContent,
                    {
                        paddingTop: headerHeight + (headerTitle === '拼车进行中' ? 90 : 0), // 90为OrderInfoDisplay高度，按实际调整
                    },
                ]}
                keyboardShouldPersistTaps="handled"
            >
                {/* 地图组件 */}
                <MapScreen
                    ref={mapRef}
                    location={userLocation}
                    setLocation={setUserLocation}
                    routeplanningData={routePlanningData}
                />
                {headerTitle === '查看路线' && (
                    <View>
                        <RouteInfoDisplay
                            routeData={routePlanningData}
                            startName={orderDetails.origin_name}
                            endName={orderDetails.destination_name}
                            departureDateTime={orderDetails.departure_time}
                            activeTab={"拼车"} 
                            onCancel={handleCancelRoutePlanning} // 传递取消回调
                            onConfirm= {()=>{setShowInputModal(true)}} // 传递确认回调
                        />
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
                                            <TouchableOpacity style={styles.button} onPress={handleConfirmCarpool}>
                                                <Text style={styles.submitButtonText}>确认</Text>
                                            </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </Modal>
                    </View>
                )}

                {headerTitle === '拼车进行中' && (
                    <OperationCard
                        order={orderDetails}
                        style={{
                            position: 'absolute',
                            bottom: 40,
                        }}
                    />
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    scrollViewContent:{
        flexGrow: 1,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
        color: '#666',
    },
    routeHeaderCurtain: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#ffffff', 
        height: 75,
        paddingHorizontal: 20, 
        zIndex: 10, 
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
    buttonIcon: {
        width: 40,
        height: 40,
        resizeMode: 'contain',
    },
});


export default SquareDetail;