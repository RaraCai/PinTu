import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const {width,height} = Dimensions.get('window');

// --- 辅助函数 (保持不变) ---
const formatDistance = distanceInMeters => {
  if (distanceInMeters === undefined || distanceInMeters === null)
    return '? km';
  const numDistance = parseInt(distanceInMeters, 10);
  if (isNaN(numDistance)) return '? km';
  const distanceInKm = (numDistance / 1000).toFixed(1);
  return `${distanceInKm} km`;
};

const formatDuration = durationInSeconds => {
  if (durationInSeconds === undefined || durationInSeconds === null)
    return '? min';
  const numDuration = parseInt(durationInSeconds, 10);
  if (isNaN(numDuration)) return '? min';
  const minutes = Math.round(numDuration / 60);
  if (minutes < 60) {
    return `${minutes} 分钟`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} 小时`;
    } else {
      return `${hours} 小时 ${remainingMinutes} 分钟`;
    }
  }
};

const formatTime = date => {
  if (!date || isNaN(date.getTime())) {
    return '--';
  }
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

// --- 主组件 ---
const RouteInfoDisplay = ({
  routeData,
  startName,
  endName,
  departureDateTime, // 格式: "YYYY/MM/DD HH:mm"
  activeTab,
  onCancel, // 取消的回调
  onConfirm, // 新增：确认的回调
}) => {
  const pathInfo =
    routeData?.paths && routeData.paths.length > 0 ? routeData.paths[0] : null;
  const distance = pathInfo?.distance;
  const durationString = pathInfo?.cost?.duration;

  const displayDate = departureDateTime?.split(' ')[0] || '选择的日期';
  const displayTime = departureDateTime?.split(' ')[1] || '选择的时间';

  // --- 计算预计到达时间 (使用手动解析) ---
  let estimatedArrivalTime = '--';

  if (
    typeof departureDateTime === 'string' &&
    departureDateTime.length > 0 &&
    typeof durationString === 'string' &&
    durationString.length > 0
  ) {
    try {
      // (时间计算逻辑保持不变)
      const parts = departureDateTime.split(' ');
      const dateParts = parts[0]?.split('/');
      const timeParts = parts[1]?.split(':');
      let departureDate = null;
      if (
        parts.length === 2 &&
        dateParts?.length === 3 &&
        timeParts?.length === 2
      ) {
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10);
        const day = parseInt(dateParts[2], 10);
        const hour = parseInt(timeParts[0], 10);
        const minute = parseInt(timeParts[1], 10);
        if (
          !isNaN(year) &&
          !isNaN(month) &&
          !isNaN(day) &&
          !isNaN(hour) &&
          !isNaN(minute)
        ) {
          departureDate = new Date(year, month - 1, day, hour, minute);
        }
      }
      const durationSeconds = parseInt(durationString, 10);
      if (
        departureDate &&
        !isNaN(departureDate.getTime()) &&
        !isNaN(durationSeconds)
      ) {
        const arrivalTimestamp =
          departureDate.getTime() + durationSeconds * 1000;
        const arrivalDate = new Date(arrivalTimestamp);
        estimatedArrivalTime = formatTime(arrivalDate);
      } else {
        console.warn('无法计算到达时间，出发时间或时长解析失败。');
      }
    } catch (error) {
      console.error('计算到达时间时发生错误:', error);
    }
  } else {
    console.warn('出发时间或时长参数缺失或类型错误:', {
      departureDateTime,
      durationString,
    });
  }
  // --- 结束计算 ---

  // --- 占位数据 ---
  const driverName = '路线规划结果';
  const driverAvatar = require('../../assets/logo.png');
  const rating = null;
  // 使用API返回的价格，如果存在的话
  const estimatedPrice = routeData?.taxi_cost;

  return (
    <View style={styles.cardContainer}>
      {/* --- 顶部: 用户/司机信息 (占位符) --- */}
      <View style={styles.userInfoSection}>
        <Image source={driverAvatar} style={styles.avatar} />
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>{driverName}</Text>
          {!rating && (
            <Text style={styles.ratingPlaceholder}>仅显示路线规划</Text>
          )}
        </View>
      </View>

      {/* --- 中部: 路线信息 --- */}
      <View style={styles.routeInfoSection}>
        <Text style={styles.dateText}>{displayDate}</Text>
        <Text style={styles.routeText} numberOfLines={2} ellipsizeMode="tail">
          从 <Text style={styles.locationHighlight}>{startName || '起点'}</Text>{' '}
          到 <Text style={styles.locationHighlight}>{endName || '终点'}</Text>
        </Text>
        <Text style={styles.routeDetailText}>
          距离: {formatDistance(distance)}・预计耗时:{' '}
          {formatDuration(durationString)}
        </Text>
      </View>

      {/* --- 详情部分 --- */}
      <View style={styles.detailsSection}>
        {/* 出发时间 */}
        <View style={styles.detailItem}>
          <Image
            source={require('../../assets/Icon_Clock.png')}
            style={[styles.detailIcon, styles.timeIconColor]}
          />
          <Text style={styles.detailValue}>{displayTime}</Text>
          <Text style={styles.detailLabel}>出发时间</Text>
        </View>

        {/* 预计到达时间 */}
        <View style={styles.detailItem}>
          <Image
            source={require('../../assets/Icon_Clock.png')} // 可以考虑换一个到达图标
            style={[styles.detailIcon, styles.onTimeIconColor]}
          />
          <Text style={styles.detailValue}>{estimatedArrivalTime}</Text>
          <Text style={styles.detailLabel}>预计到达</Text>
        </View>

        {/* 预估价格 */}
        <View style={styles.detailItem}>
          <Image
            source={require('../../assets/Icon_Money.png')}
            style={[styles.detailIcon, styles.priceIconColor]}
          />
          <Text style={styles.detailValue}>
            {/* 显示价格，如果为 null/undefined 则显示 '--' */}
            {estimatedPrice != null ? `${estimatedPrice}元` : '--'}
          </Text>
          <Text style={styles.detailLabel}>
          {activeTab === '发车'? '订单总价' : '人均价格'}
          </Text>
        </View>
      </View>

      {/* --- 操作按钮区域 --- */}
        <View style={styles.actionsContainer}>
          {/* 取消按钮 */}
          <TouchableOpacity
            style={[styles.actionButtonBase, styles.cancelButton]} // 应用基础和特定样式
            onPress={onCancel} // 使用传入的 onCancel 回调
          >
            <Text style={[styles.actionButtonTextBase, styles.cancelButtonText]}>
            {activeTab === '发车'? '取消路线' : '暂不参与'}
            </Text>
          </TouchableOpacity>

          {/* 确认按钮 */}
          <LinearGradient
            colors={['rgba(153, 145, 246, 1)', 'rgba(117, 106, 237, 1)']}
            start={{x: 0.9928, y: 0.5072}}
            end={{x: 0.0072, y: 0.5072}}
            style={[styles.actionButtonBase, styles.confirmButton]}>
              <TouchableOpacity
                onPress={onConfirm} // 使用传入的 onConfirm 回调
              >
                <Text style={[styles.actionButtonTextBase, styles.confirmButtonText]}>
                  {activeTab === '发车'? '发起订单' : '参与拼车'}
                </Text>
              </TouchableOpacity>
          </LinearGradient>
        </View>
    </View>
  );
};

// --- 样式 ---
const styles = StyleSheet.create({
  cardContainer: {
    position: 'absolute',
    bottom: 10,
    width: width * 0.9,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    paddingBottom: 15,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    alignSelf: 'center',
  },
  userInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    marginRight: 12,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  ratingPlaceholder: {
    fontSize: 14,
    color: '#888',
  },
  routeInfoSection: {
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#555',
    marginBottom: 8,
  },
  routeText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#808080',
    marginBottom: 6,
  },
  locationHighlight: {
    fontWeight: 'bold',
    color: '#333',
  },
  routeDetailText: {
    fontSize: 13,
    color: '#777',
  },
  detailsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    marginBottom: 20, // 按钮和详情之间的间距
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
    marginHorizontal: -5,
  },
  detailItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 5,
  },
  detailIcon: {
    width: 28,
    height: 28,
    marginBottom: 6,
  },
  timeIconColor: {
    tintColor: '#29B6F6',
  },
  onTimeIconColor: {
    tintColor: '#66BB6A',
  },
  priceIconColor: {
    tintColor: '#FFA726',
  },
  detailValue: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
    minHeight: 20,
    textAlign: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  // --- 新增样式 ---
  actionsContainer: {
    flexDirection: 'row', // 水平排列
    justifyContent: 'space-between', // 两端对齐，中间留空隙
    marginTop: 5, // 与上方详情部分的间距
  },
  actionButtonBase: {
    // 按钮的基础样式
    flex: 1, // 让按钮平分宽度
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 5, // 按钮之间的水平间距
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  confirmButton: {
    // 确认按钮特定样式
    backgroundColor: '#6c5ce7', // 主题紫色背景
  },
  actionButtonTextBase: {
    // 按钮文字基础样式
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButtonText: {
    // 取消按钮文字颜色
    color: '#ccc', 
  },
  confirmButtonText: {
    // 确认按钮文字颜色
    color: '#fff', // 白色文字
  },
  // --- 结束新增样式 ---
});

export default RouteInfoDisplay;
