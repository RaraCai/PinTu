import React, {useState, useEffect,} from 'react';
import{
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    Alert,
    Modal
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../../../config'; 
import {useNavigation} from '@react-navigation/native';
import { ScrollView } from 'react-native-gesture-handler';

const OperationCard = ({order, style}) => {
    const [driverInfo, setDriverInfo] = useState({});           // 发起人用户信息（头像、用户名）
    const [passengersInfo, setPassengersInfo] = useState([]);   // 乘客用户信息（头像、用户名）
    const [selectedUserId, setSelectedUserId] = useState(null); // 当前选中的用户ID
    const [loading, setLoading] = useState(true);
    const [newApplies, setNewApplies] = useState([]);           // 新乘车申请
    const [showAppliesModal, setShowAppliesModal] = useState(false);    // 司机审批面板
    const [driving, setDriving] = useState(false); // 是否正在行驶中
    const [showEndModal, setShowEndModal] = useState(false);    // 确认结束行程弹窗
    const navigation = useNavigation();
    
    // 处理拒绝或同意拼车申请
    const handleApplyResponse = async(userId, isApproved) =>{
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BASE_URL}/orders/${order.order_id}/applies/${userId}/${isApproved ? 'approve' : 'reject'}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });
                
            if (response.ok) {
                Alert.alert('提示', isApproved ? '您已同意该乘客的拼车申请，期待拼车时与TA见面吧~' : '您已拒绝该乘客的拼车申请~');
                // 从newApplies中移除已处理的申请
                setNewApplies(prevApplies => prevApplies.filter(apply => apply.u_id !== userId));
                
                if (isApproved === true){
                    // 刷新成员列表
                    loadMembers(order); 
                }
            } else {
                Alert.alert('操作失败', '请重试');
            }
        } catch (error) {
            Alert.alert('错误', error.message);
        }
    };

    // 处理乘客已上车
    const handleOnBoard = async(userId) => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BASE_URL}/orders/${order.order_id}/passengers/${userId}/get_on`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                Alert.alert('提示', '您已确认该乘客已上车，请等待所有乘客均上车后发车哦~');
                // 刷新成员列表
                loadMembers(order);
                setSelectedUserId(null); // 清除选中状态
            } else {
                Alert.alert('操作失败', '请重试');
            }
        } catch (error) {
            Alert.alert('错误', error.message);
        }
    };

    // 处理司机开启行程
    const handleOnDrive = async() => {
        try{
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BASE_URL}/orders/${order.order_id}/drive`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (response.ok){
                const data = await response.json();
                if (data.all_get_on === false){
                    Alert.alert('无法开启行程', data.message);
                }
                else if (data.all_get_on === true){
                    Alert.alert('行程已开始', '请您注意行车安全，祝您一路顺风~');
                    // 刷新成员列表
                    loadMembers(order);
                    setSelectedUserId(null); // 清除选中状态
                    setDriving(true); // 设置为行驶中状态
                }
            }
            else{
                Alert.alert('操作失败', '请重试');
            }
        }
        catch (error){
            Alert.alert('错误', error.message);
        }
    };

    // 处理司机结束行程
    const handleEndDriving = async() => {
        try{
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BASE_URL}/orders/${order.order_id}/end`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (response.ok){
                // 行程结束，前往评价页面
                navigation.navigate('Review',{order_id: order.order_id});
            }
            else{
                Alert.alert('操作失败', '请重试');
            }
        }
        catch (error){
            Alert.alert('错误', error.message);
        }
    };
    
    // 封装用户信息查看组件
    const AvatarWithInfo = ({ id, name, avatar, getOn}) => {
        const isSelected = selectedUserId === id;

        const handlePress = () => {
            // 如果已上车或未选中，则只切换显示名字
            if (getOn) {
                setSelectedUserId(id === selectedUserId ? null : id);
            } 
            // 如果未上车且未选中，则显示名字和按钮
            else if (!isSelected) {
                setSelectedUserId(id);
            } 
            // 如果未上车且已选中，则清除选中状态
            else {
                setSelectedUserId(null);
            }
        };

        return (
            <TouchableOpacity
                style={styles.AvatarWithInfoContainer}
                onPress={handlePress}
            >
                <View style={[styles.avatarContainer, isSelected && styles.selectedBorder]}>
                    <Image
                        source={require('../../assets/avatar.png')}
                        style={styles.avatar}
                    />
                </View>
                <Text
                    style={[
                        styles.name,
                        !isSelected && { color: 'transparent' } // 占位但不可见
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    {name}
                </Text>
            </TouchableOpacity>
        );
    };

    // 封装乘客上车确认按钮
    const BoardButtons = ({id, onCancel, onBoard, onDrive}) => {
        return (
            <View style={styles.buttonRow}>
                { id !== order.driver_id ? (
                    <>
                        <TouchableOpacity
                            style={[styles.buttonBase, {borderWidth: 1, borderColor: '#E1E1E1'}]}
                            onPress={onCancel}
                        >
                            <Text style={[styles.buttonText, {color: '#E1E1E1'}]}>取消</Text>
                        </TouchableOpacity>
                        <LinearGradient
                            colors={['rgba(153, 145, 246, 1)', 'rgba(117, 106, 237, 1)']}
                            start={{x: 0.9928, y: 0.5072}}
                            end={{x: 0.0072, y: 0.5072}}
                            style={[styles.buttonBase]}>
                            <TouchableOpacity onPress={() => onBoard(id)}>
                                <Text style={[styles.buttonText, {color: '#fff'}]}>已上车</Text>
                            </TouchableOpacity>
                        </LinearGradient>
                    </>
                ) : (
                    <>
                        <TouchableOpacity
                            style={[styles.buttonBase, {borderWidth: 1, borderColor: '#E1E1E1'}]}
                            onPress={onCancel}
                        >
                            <Text style={[styles.buttonText, {color: '#E1E1E1'}]}>取消</Text>
                        </TouchableOpacity>
                        <LinearGradient
                            colors={['rgba(153, 145, 246, 1)', 'rgba(117, 106, 237, 1)']}
                            start={{x: 0.9928, y: 0.5072}}
                            end={{x: 0.0072, y: 0.5072}}
                            style={[styles.buttonBase]}>
                            <TouchableOpacity onPress={onDrive}>
                                <Text style={[styles.buttonText, {color: '#fff'}]}>开始行程</Text>
                            </TouchableOpacity>
                        </LinearGradient>
                    </>
                )}
            </View>
        );
    };
    
    // 封装申请信息组件
    const ApplyItem = ({apply, onResponse}) => {
        return(
            <View style={styles.applyItem}>
                {/* 申请人信息 */}
                <View style={styles.applyInfo}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Profile', { view: 'others', u_id: apply.u_id })}
                    >
                        <Image
                            source={require('../../assets/avatar.png')} // TODO: 待个人中心完成，改头像
                            style={styles.userAvatar}
                        />
                    </TouchableOpacity>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{apply.name}</Text>
                        <View style={styles.ratingContainer}>
                            <Text style={styles.ratingText}>★{apply.stars}</Text>
                            <Text style={styles.ratingCountText}>({apply.total})</Text>
                        </View>
                    </View>
                </View>

                {/* --- 路线信息 --- */}
                <View style={{marginLeft: 10, marginRight: 10, marginBottom: 10}}>
                    <Text style={styles.dateText}>{order.departure_time}</Text>
                    <Text style={styles.routeText} numberOfLines={2} ellipsizeMode="tail">
                        从 <Text style={styles.locationHighlight}>{order.origin_name || '起点'}</Text>{' '}
                        到 <Text style={styles.locationHighlight}>{order.destination_name || '终点'}</Text>
                    </Text>
                </View>

                {/* 操作按钮 */}
                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.buttonBase, {borderWidth: 1, borderColor: '#FC6752'}]}
                        onPress={() => onResponse(apply.u_id, false)}
                    >
                        <Text style={[styles.buttonText,{color: '#FC6752'}]}>拒绝</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.buttonBase, {borderWidth: 1, borderColor: '#43CF7C'}]}
                        onPress={() => onResponse(apply.u_id, true)}
                    >
                        <Text style={[styles.buttonText, {color: '#43CF7C'}]}>同意</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };


    // 组件挂载时请求本单成员信息
    const loadMembers = async(order) =>{
        try{
            const response = await fetch(`${BASE_URL}/orders/${order.order_id}/members`,{
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            if (response.ok) {
                const data = await response.json();
                setDriverInfo(data.driver);
                setPassengersInfo(data.passengers);
                setNewApplies(data.new_applies);
                if(newApplies.length === 0){
                    setShowAppliesModal(false);
                }
                setLoading(false);
                return;   
            }
            Alert.alert('错误', '未能成功获取本订单成员信息');
        }
        catch(error){
            Alert.alert('错误', error.message);
        }
    };


    useEffect(()=>{
        loadMembers(order);
        if (order.order_status === 'driving'){
            setDriving(true);
        }
    },[]);



    if (loading){
        return(
            <View style={[styles.container, style]}>
                <Text style={styles.info}>-订单成员加载中-</Text>
            </View>
        );
    }
    else{
        return(
            <View style={[styles.container, style]}>
                <Text style={styles.title}>拼车成员</Text>
                <View style={styles.divider}></View>
                
                <View style={styles.contentWrapper}>
                    {/* 本单成员信息 */}
                    <View style={styles.memberContainer}>
                        {/* 司机 */}
                        <View style={styles.driveContainer}>
                            <AvatarWithInfo
                                id={driverInfo.u_id}
                                name={driverInfo.name}
                                avatar={driverInfo.avatar}
                                getOn={true}
                            />
                            <Image
                                source={require('../../assets/icon-wheel.png')}
                                style={{width: 20, height: 20, resizeMode: 'contain', marginBottom: 10}}
                            />
                        </View>
                        
                        {/* 乘客 */}
                        <View style={styles.memberList}>
                            <ScrollView horizontal>
                                {passengersInfo.map((passenger) => (
                                    <AvatarWithInfo
                                        key={passenger.u_id}
                                        id={passenger.u_id}
                                        name={passenger.name}
                                        avatar={passenger.avatar}
                                        getOn={passenger.get_on ? true : false}
                                    />
                                ))}
                            </ScrollView>
                        </View>
                    </View>

                    {/* 新拼车申请 */}
                    { order.role === 'driver' && (
                        <View style={{marginBottom: 20}}>
                            { newApplies.length > 0 ? (
                                <TouchableOpacity
                                    onPress={() => setShowAppliesModal(true)}
                                >
                                    <Image 
                                        source={require('../../assets/icon-new-applies.png')}
                                        style={{width: 48, height: 48 }}
                                    />
                                </TouchableOpacity>
                                
                            ) : (
                                <TouchableOpacity
                                    onPress={() => Alert.alert('提示', '暂无新乘车申请，耐心等待其他乘客吧！')}
                                >
                                    <Image 
                                        source={require('../../assets/icon-applies.png')}
                                        style={{width: 48, height: 48,}}
                                    />
                                </TouchableOpacity>
                                
                            )}
                        </View>
                    )}
                    
                </View>

                {/* 底部操作区域 */}
                {driving ? (
                    <View style={{ marginBottom: 16 }}>
                        {/* 结束行程按钮 */}
                        <TouchableOpacity
                            style={[styles.buttonBase, {backgroundColor:'#FC6752', width: 300}]}
                            onPress={() => {
                                setShowEndModal(true);
                            }}
                        >
                            <Text style={[styles.buttonText, {color: '#fff'}]}>结束行程</Text>
                        </TouchableOpacity>
                    </View>
                ) : 
                    order.role === 'passenger' || (order.role === 'driver' && !selectedUserId) ? (
                        <Text style={styles.info}>-行车途中，请您系好安全带哦-</Text>
                    ) : order.role === 'driver' && selectedUserId && !passengersInfo.find(p => p.u_id === selectedUserId)?.get_on ? 
                    (
                        <View style={{ marginBottom: 16 }}>
                            <BoardButtons
                                id={selectedUserId}
                                onCancel={() => setSelectedUserId(null)}
                                onBoard={handleOnBoard}
                                onDrive={handleOnDrive}
                            />
                        </View>
                    ) : 
                    (
                    <Text style={styles.info}>-行车途中，请您系好安全带哦-</Text>
                )}

                {/* 拼车申请处理 Modal */}
                <Modal
                    visible={showAppliesModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowAppliesModal(false)}
                >
                    <TouchableOpacity 
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowAppliesModal(false)}
                    >
                        <TouchableOpacity  // 改用 TouchableOpacity，使得按钮点击事件可以正常冒泡
                            activeOpacity={1}
                            onPress={(e) => e.stopPropagation()}    // 阻止事件冒泡导致弹层关闭
                            style={{
                                width: '100%',
                            }}
                        >
                            <ScrollView>
                                {newApplies.map(apply => (
                                    <ApplyItem 
                                        key={apply.u_id}
                                        apply={apply}
                                        onResponse={handleApplyResponse}
                                    />
                                ))}
                            </ScrollView>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Modal>

                {/* 结束行程Modal */}
                <Modal
                    visible={showEndModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowEndModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.endContainer}>
                            <Image
                                source={require('../../assets/warning.png')}
                                style={styles.warningIcon}
                            />
                            <Text style={{fontSize:18, marginBottom:12, fontWeight: 500, color: '#383838'}}>行程结束确认</Text>
                            <Text style={{fontSize:14, marginBottom:12, color: '#50565A'}}>您即将结束行程，请确认拼车乘客均已到达目的地且无新乘客加入申请。本操作不可撤销，您确定要结束行程吗？</Text>
                                      
                            <View style={{flexDirection:'row',justifyContent:'space-between',width:'100%', gap:16 }}>
                                <TouchableOpacity 
                                    style={styles.button} 
                                    onPress={()=>setShowEndModal(false)}
                                >
                                  <Text style={styles.cancelButtonText}>取消</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={styles.button} 
                                    onPress={() => {handleEndDriving()}}
                                >
                                    <Text style={styles.submitButtonText}>确认</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    }
};

const styles = StyleSheet.create({
    container:{
        backgroundColor: '#fff',
        borderRadius: 30,
        padding: 20,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 3},
        shadowOpacity: 0.15,
        shadowRadius: 6,
        width: '90%',
        alignSelf: 'center',
        alignItems: 'center',
        height: 200,
    },
    title:{
        fontSize: 16,
        color: '#383838',
        alignSelf: 'flex-start',
        marginLeft: 10,
    },
    divider:{
        height: 1,
        width: '95%',
        backgroundColor: '#EDEDED',
        marginTop: 10,
        marginBottom: 10,
    },
    info:{
        color:'#808080',
    },
    contentWrapper: {
        flexDirection: 'row',
        width: '80%',         
        alignItems: 'center',
        justifyContent: 'space-between', 
        marginRight: 45, 
    },
    memberContainer:{
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
    },
    driveContainer:{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 10,
    },
    AvatarWithInfoContainer: {
        alignItems: 'center',
        justifyContent: 'top',
    },
    avatarContainer: {
        width: 46,
        height: 46,
        borderRadius: 23,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    selectedBorder: {
        borderWidth: 2,
        borderColor: '#877EF2',
    },
    name: {
        fontSize: 12,
        textAlign: 'center',
        color: '#877EF2',
    },
    memberList: {
        flexDirection: 'row',
        marginBottom: 8,
        marginLeft: 8,
    },
    buttonRow:{
        flexDirection: 'row',
        gap: 15,
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    buttonBase:{
        borderRadius: 25,
        paddingVertical: 10,
        paddingHorizontal: 16,
        alignItems: 'center',
        width: 150,
    },
    buttonText:{
        fontSize: 16,
        fontWeight: 500,
    },
    applyItem: {
        width: '85%',
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 18,
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
    applyInfo:{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    userInfo: {
        flex: 1,
    },
    userAvatar:{
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 10,
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingText: {
        fontSize: 14,
        color: '#ffc107',
    },
    ratingCountText: {
        fontSize: 14,
        color: '#888',
        paddingLeft: 5,
        paddingVertical: 5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
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
    endContainer:{
        backgroundColor:'#fff', // 白色卡片
        borderRadius:15,
        padding:24,
        paddingBottom: 18,
        width:335,
        alignItems:'center',
        elevation: 8, // 安卓阴影
        shadowColor: '#000', // iOS阴影
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    cancelButtonText: {
        color:'#BDBCBC',
        fontSize: 16,
    },
    button: {
        backgroundColor:'#fff',
        borderRadius: 6,
        width: '45%',
        paddingVertical: 8,
        alignItems: 'center',
    },
    submitButtonText: {
        color:'#877EF2',
        fontSize: 16,
    },
    warningIcon:{
        width:72,
        height:72,
        marginBottom:16,
    },
});

export default OperationCard;