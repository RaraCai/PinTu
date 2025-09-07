import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL  from '../../config'; 

const {width, height} = Dimensions.get('window');

const ReviewScreen = ({navigation, route}) => {
    const { order_id } = route.params;    // 从路由获取传递的order_id参数
    const [order, setOrder] = useState(null); // 行驶信息
    const [driver, setDriver] = useState(null); // 司机信息
    const [members, setMembers] = useState(null); // 乘客信息
    const [ratings, setRatings] = useState({}); // 存储评分历史，防止重复评分
    

    // 封装行驶信息卡片
    const OrderInfoCard = (style) => {
      return (
        <View style={[styles.orderInfoCardContainer, style]}>
          {/* 订单时间 */}
          <View style={styles.datetimeRow}>
            <Text style={{color:'#000', fontSize: 14}}>订单时间</Text>
            <Text style={{color:'#50565A', fontSize: 14}}>{order.datetime}</Text>
          </View>

          {/* 起点和终点 */}
          <View style={styles.routeRow}>
            <Image
              source={require('../assets/start-dots-end.png')}
              style={{    width: 12, height: 50, resizeMode: 'contain'}}
            />
            <View style={{flexDirection: 'column', gap: 10}}>
              <Text style={{color: '#50565A', fontSize: 14 }}>{order.start_address}</Text>
              <Text style={{color: '#50565A', fontSize: 14 }}>{order.end_address}</Text>
            </View>
          </View>

          {/* 用时、总价、油耗 */}
          <View style={styles.infoRow}>
            {/* 行程用时 */}
            <View style={styles.infoItem}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Image
                  source={require('../assets/Icon_Purple_Clock.png')}
                  style={{width: 20, height: 20, resizeMode: 'contain', marginRight: 5}}
                />
                <Text style={{color: '#383838', fontSize: 16, fontWeight: 500}}>{order.duration}分钟</Text>
              </View>
              <Text style={{color: '#BDBCBC', fontSize: 12}}>行程用时</Text>
            </View>
            {/* 本单总价 */}
            <View style={styles.infoItem}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Image
                  source={require('../assets/Icon_Money.png')}
                  style={{width: 20, height: 20, resizeMode: 'contain', marginRight: 5}}
                />
                <Text style={{color: '#383838', fontSize: 16, fontWeight: 500}}>{order.cost}元</Text>
              </View>
              <Text style={{color: '#BDBCBC', fontSize: 12}}>本单总价</Text>
            </View>
            {/* 车辆油耗 */}
            <View style={styles.infoItem}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Image
                  source={require('../assets/Icon_Fuel.png')}
                  style={{width: 20, height: 20, resizeMode: 'contain', marginRight: 5}}
                />
                <Text style={{color: '#383838', fontSize: 16, fontWeight: 500}}>{order.fuel}L</Text>
              </View>
              <Text style={{color: '#BDBCBC', fontSize: 12}}>车辆油耗</Text>
            </View>
          </View>
        </View>
      );
    };

    // 封装用户打分卡片
    const RateCard = ({u_id, u_name, u_avatar, u_role }) => {
      const [rating, setRating] = useState(ratings[u_id] || 0); // 初始化时检查是否有历史评分
      const [isSubmitting, setIsSubmitting] = useState(false);
      const hasRated = ratings[u_id] !== undefined; // 检查是否已评分

      const handleRatingChange = (selectedRating) => {
        if (!hasRated) { // 只有未评分时才允许修改
          setRating(selectedRating);
        }
      };

      const handleSubmit = async () => {
        if (rating === 0) {
          Alert.alert('提示', '请选择1~5星的评分，0星实在太残忍啦！');
          return;
        }

        setIsSubmitting(true);
        try {
          const token = await AsyncStorage.getItem('token');
          const response = await fetch(`${BASE_URL}/orders/${order_id}/rate/${u_id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ 'rating': rating }),
          });

          if (response.ok) {
            Alert.alert('提示', '您的评分提交成功~');
            // 更新本地评分历史
            setRatings(prev => ({
              ...prev,
              [u_id]: rating
            }));
          } else {
            const error = await response.json();
            Alert.alert('评价失败', error.message || '请重试');
          }
        } catch (error) {
          Alert.alert('错误', error.message);
        } finally {
          setIsSubmitting(false);
        }
      };

      return(
        <View style={styles.rateCardContainer}>
          {/* 用户头像 */}
          <Image
            source={require('../assets/avatar.png')} // TODO: 个人中心完成后替换头像u_avatar
            style={styles.avatarImage}
          />

          {/* 用户名和提示文字 */}
          <Text style={styles.userName}>{u_name}</Text>
          <Text style={styles.rateHint}>{u_role === 'driver' ? '为您的拼车发起人打分' : '为您的拼车同行人打分'}</Text>

          {/* 星星评分 */}
          <View style={styles.starContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity 
                key={star}
                onPress={() => handleRatingChange(star)}
              >
                <Image
                  source={star <= rating ? 
                    require('../assets/star-filled.png') : 
                    require('../assets/star-outline.png')
                  }
                  style={styles.starIcon}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* 提交按钮 */}
          {hasRated ? (
            <Text style={{color: '#808080', marginTop: 10}}>-您已经评价过该用户-</Text>
          ) : (
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <LinearGradient
                colors={['rgba(153, 145, 246, 1)', 'rgba(117, 106, 237, 1)']}
                start={{x: 0.9928, y: 0.5072}}
                end={{x: 0.0072, y: 0.5072}}
                style={styles.button}
              >
                <Text style={styles.buttonText}>
                  {isSubmitting ? '提交中...' : '提交评价'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      );
    };

    // 根据order_id获取行驶信息
    const getOrderInfo = async() =>{
      try{
        const token = await AsyncStorage.getItem('token');
        const response = await fetch(`${BASE_URL}/orders/${order_id}/review`, {
          method: 'GET',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok){
          const data = await response.json();
          const result = data.result;
          setOrder(result.order_detail);
          setDriver(result.driver_detail);
          setMembers(result.members_detail);
          // 将评分历史转换为以被评者ID为key的对象
          if (result.ratings_detail.length > 0) {
            const ratingsMap = {};
            result.ratings_detail.forEach(rating => {
              ratingsMap[rating.rater] = rating.stars;
            });
            setRatings(ratingsMap);
          }
        }
        else{
          Alert.alert('操作失败', '请重试');
        }
      }
      catch(error){
        Alert.alert('错误', error.message);
      }
    };

    useEffect(() => {
        //页面挂载时获取行驶信息卡片
        getOrderInfo();
        
    },[]);


    return (
        <View style={styles.container}>
            {/* 固定在顶部的标题栏 */}
              <View style={styles.headerCurtain}>
                  <TouchableOpacity
                    style={styles.backButtonContainer}
                    onPress={() =>
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Home' }],
                      })
                    }
                  >
                    <Image
                      source={require('../assets/Icon-back.png')} 
                      style={styles.backArrowIcon}
                    />
                    <Text style={styles.headerTitle}>拼车已结束</Text>
                  </TouchableOpacity>
              </View>
              

              {/* 评价区域 */}
              <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
              >
                <View style={styles.content}>
                  {/* 行驶信息卡片 */}
                  { order && (
                    <OrderInfoCard
                      style={{position: 'absolute', top: 75, left: 0, right: 0, }}
                    />
                  )}
                  {/* 评分卡片 */}
                  { order && order.role === 'passenger' && driver && (
                    <RateCard
                      u_id={driver.u_id}
                      u_name={driver.u_name}
                      u_avatar={driver.u_avatar}
                      u_role="driver"
                      onRateChange={(id, rating) => {}}
                    />
                  )}
                  {members && (
                    <>
                      {members.map((member)=>(
                        <RateCard
                          key={member.u_id}
                          u_id={member.u_id}
                          u_name={member.u_name}
                          u_avatar={member.u_avatar}
                          u_role="passenger"
                          onRateChange={(id, rating) => {}}
                        />
                      ))}
                    </>
                  )}
                </View>
                
              </ScrollView>
        </View>
    );
};

// 定义样式
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
    paddingBottom: 20,
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
  orderInfoCardContainer:{
    flex: 1,
    justifyContent: 'flex-start',
    color: '#BDBCBC',
    fontSize: 14,
    width: '100%',
    paddingHorizontal: 16,
  },
  datetimeRow:{
    flexDirection: 'row',
    marginBottom: 10,
    gap: 10,
  },
  routeRow:{
    flexDirection: 'row',
    marginBottom: 20,
    alignItems:'flex-start',
    gap: 10,
  },
  infoRow:{
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  infoItem:{
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateCardContainer: {
    height: 210,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 50,  
    shadowColor: '#979797',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 10,
    position: 'relative', 
  },
  button:{
    width: width * 0.7,
    height: height * 0.05,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText:{
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    position: 'absolute',  
    top: -32,  
    backgroundColor: '#fff',   
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '500',
    color: '#383838',
    marginTop: 20,
  },
  rateHint: {
    fontSize: 14,
    color: '#50565A',
    paddingVertical: 10,
    fontWeight: 500,
  },
  starContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  starIcon: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
});

export default ReviewScreen;
