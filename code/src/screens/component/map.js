// MapScreen.js

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  View,
  StyleSheet,
  Platform,
  PermissionsAndroid,
  Image,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import {MapView, MapType, AMapSdk, Marker, Polyline} from 'react-native-amap3d';

// 初始化高德 API（目前仅提供 Android 的 key）
AMapSdk.init(
  Platform.select({
    android: '8f11bf56c8b1744a13fc874d40d02eb2',
    // 如需支持 iOS，请在此添加对应的 key
  }),
);

// --- 辅助函数: 解析 Polyline 字符串 ---
const parsePolyline = polylineString => {
  if (!polylineString) {
    return [];
  }
  return polylineString
    .split(';')
    .map(pointStr => {
      if (!pointStr) {
        return null;
      }
      const [longitude, latitude] = pointStr.split(',');
      if (longitude && latitude) {
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);
        // 添加额外的检查以确保经纬度是有效的数字
        if (!isNaN(lat) && !isNaN(lon)) {
          return {latitude: lat, longitude: lon};
        }
      }
      return null;
    })
    .filter(p => p !== null); // 过滤掉无效点
};

// --- 辅助函数: 计算两点间距离 (Haversine 公式) ---
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // 地球半径 (km)
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // 距离 (km)
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// --- 辅助函数: 根据距离估算缩放级别 ---
function getZoomLevel(distanceKm) {
  const zoomLevels = [
    {maxDistance: 0.5, zoom: 17},
    {maxDistance: 1, zoom: 16},
    {maxDistance: 2.5, zoom: 15},
    {maxDistance: 5, zoom: 14},
    {maxDistance: 10, zoom: 13},
    {maxDistance: 25, zoom: 12},
    {maxDistance: 50, zoom: 11},
    {maxDistance: 100, zoom: 10},
    {maxDistance: 250, zoom: 9},
  ];

  for (const {maxDistance, zoom} of zoomLevels) {
    if (distanceKm < maxDistance) {
      return zoom;
    }
  }

  return 8; // 默认值
}
// --- 辅助函数结束 ---

const MapScreen = forwardRef(
  (
    {
      location, // 初始/当前位置
      setLocation, // 更新当前位置的回调 (如果还需要的话)
      routeplanningData, // 路线规划数据
    },
    ref,
  ) => {
    const mapInstance = useRef(null);
    // --- 用于路线显示的状态 ---
    const [routeCoordinates, setRouteCoordinates] = useState([]); // 路线坐标点
    const [startMarkerPos, setStartMarkerPos] = useState(null); // 起点标记位置
    const [endMarkerPos, setEndMarkerPos] = useState(null); // 终点标记位置
    // --- 状态结束 ---

    useEffect(() => {
      // --- 当路线数据变化时 ---
      if (
        routeplanningData &&
        routeplanningData.origin &&
        routeplanningData.destination
      ) {
        try {
          // 1. 解析起点和终点
          const startParts = routeplanningData.origin.split(',');
          const endParts = routeplanningData.destination.split(',');

          if (startParts.length === 2 && endParts.length === 2) {
            const startPos = {
              latitude: parseFloat(startParts[1]),
              longitude: parseFloat(startParts[0]),
            };
            const endPos = {
              latitude: parseFloat(endParts[1]),
              longitude: parseFloat(endParts[0]),
            };

            // 验证解析结果是否为有效数字
            if (
              !isNaN(startPos.latitude) &&
              !isNaN(startPos.longitude) &&
              !isNaN(endPos.latitude) &&
              !isNaN(endPos.longitude)
            ) {
              setStartMarkerPos(startPos); // 更新起点状态
              setEndMarkerPos(endPos); // 更新终点状态

              // 2. 解析路线 Polyline
              if (
                Array.isArray(routeplanningData.paths) &&
                routeplanningData.paths.length > 0
              ) {
                const firstPath = routeplanningData.paths[0];
                if (
                  firstPath &&
                  Array.isArray(firstPath.steps) &&
                  firstPath.steps.length > 0
                ) {
                  // 合并所有步骤的 polyline 字符串
                  const combinedPolyline = firstPath.steps
                    .map(step => step.polyline)
                    .filter(Boolean) // 过滤掉空的 polyline
                    .join(';');
                  // 解析合并后的 polyline
                  const points = parsePolyline(combinedPolyline);
                  setRouteCoordinates(points); // 更新路线坐标状态

                  // 3. 计算中点和距离，确定缩放级别并移动相机
                  if (mapInstance.current) {
                    // 计算中点
                    const midPoint = {
                      latitude: (startPos.latitude + endPos.latitude) / 2,
                      longitude: (startPos.longitude + endPos.longitude) / 2,
                    };

                    // 计算起终点直线距离
                    const distance = getDistance(
                      startPos.latitude,
                      startPos.longitude,
                      endPos.latitude,
                      endPos.longitude,
                    );

                    // 根据距离获取合适的缩放级别
                    const zoom = getZoomLevel(distance);

                    // 移动相机到中点，并设置计算出的缩放级别
                    mapInstance.current.moveCamera(
                      {
                        target: midPoint, // 移动到计算出的中点
                        zoom: zoom, // 使用根据距离计算的缩放级别
                      },
                      500, // 动画时长 500ms
                    );
                  }
                } else {
                  console.warn("路线数据存在但 'steps' 缺失或为空。");
                  setRouteCoordinates([]); // 清空旧路线
                }
              } else {
                console.warn("路线数据存在但 'paths' 缺失或为空。");
                setRouteCoordinates([]); // 清空旧路线
                setStartMarkerPos(null); // 清空标记点
                setEndMarkerPos(null);
              }
            } else {
              console.error(
                '解析起点/终点坐标失败:',
                routeplanningData.origin,
                routeplanningData.destination,
              );
              setRouteCoordinates([]); // 清空路线和标记点
              setStartMarkerPos(null);
              setEndMarkerPos(null);
            }
          } else {
            console.error(
              '无效的 origin/destination 格式:',
              routeplanningData.origin,
              routeplanningData.destination,
            );
            setRouteCoordinates([]); // 清空路线和标记点
            setStartMarkerPos(null);
            setEndMarkerPos(null);
          }
        } catch (error) {
          console.error('处理路线数据时出错:', error);
          setRouteCoordinates([]); // 清空路线和标记点
          setStartMarkerPos(null);
          setEndMarkerPos(null);
        }
      } else {
        // 当 routeplanningData 为 null 或无效时，清除路线和标记点
        setRouteCoordinates([]);
        setStartMarkerPos(null);
        setEndMarkerPos(null);
        // 此处不移动相机，保持当前状态或由 requestLocationPermission 控制
      }
    }, [routeplanningData]); // 依赖 routeplanningData

    // 我的位置图标
    const myPosition = Image.resolveAssetSource(
      require('../../assets/icon-my-position.png'),
    ).uri;

    // 请求权限及初始定位
    const requestLocationPermission = useCallback(async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            Geolocation.getCurrentPosition(
              position => {
                const currentPos = {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                };
                // 只有在没有路线数据时才因定位移动相机
                // 如果已有路线数据，则让上面的 useEffect 控制相机
                if (!routeplanningData && mapInstance.current) {
                  setLocation(currentPos); // 更新父组件状态（如果需要）
                  mapInstance.current.moveCamera(
                    {
                      target: currentPos,
                      zoom: 14, // 定位成功后的默认缩放级别
                    },
                    300, // 动画持续时间
                  );
                } else if (!routeplanningData) {
                  // 如果地图实例还没准备好，先更新位置
                  setLocation(currentPos);
                }
              },
              error => {
                console.log('获取位置出错:', error);
              },
              {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
            );
          } else {
            console.log('定位权限未授权');
          }
        } catch (err) {
          console.warn('请求权限异常：', err);
        }
      } else {
        if (!routeplanningData && mapInstance.current && location) {
          mapInstance.current.moveCamera(
            {
              target: location,
              zoom: 14,
            },
            300,
          );
        }
      }
    }, [setLocation, routeplanningData, location]); // 添加 routeplanningData 和 location 作为依赖

    useEffect(() => {
      // 组件挂载后请求定位权限
      requestLocationPermission();
    }, [requestLocationPermission]);

    // 暴露给父组件的方法
    useImperativeHandle(ref, () => ({
      moveCamera: (cameraPosition, duration = 0) => {
        if (mapInstance.current) {
          // 检查地图实例是否存在
          mapInstance.current.moveCamera(cameraPosition, duration);
        } else {
          console.warn('地图实例尚未准备好，无法调用 moveCamera');
        }
      },
    }));

    return (
      <View style={styles.container}>
        <MapView
          style={styles.map}
          mapType={MapType.Standard} // 标准地图
          zoomControlsEnabled={false} // 不显示缩放按钮
          // 初始相机位置仍然使用 props.location (如果有效)
          initialCameraPosition={
            location ? {target: location, zoom: 14} : undefined
          }
          // onCameraIdle={({nativeEvent}) => console.log(nativeEvent)} // 可用于调试相机事件
          ref={mapInstance} // 关联 ref
          labelsEnabled={true} // 显示地标标签
          compassEnabled={false} // 不显示指南针
          zoomGesturesEnabled={true} // 允许缩放手势
          scrollGesturesEnabled={true} // 允许拖动手势
          scaleControlsEnabled={false} // 不显示比例尺
        >
          {/* 始终显示当前位置标记 (如果 location 有效) */}
          {location && (
            <Marker
              position={location} // 使用 location prop
              icon={{
                uri: myPosition, // 使用自定义图标
                width: 40, // 图标宽度
                height: 40, // 图标高度
              }}
              anchor={{x: 0.5, y: 0.5}} // 图标锚点设为中心
            />
          )}

          {/* --- 条件渲染路线和起终点 --- */}
          {/* 仅当路线坐标存在时渲染 Polyline */}
          {routeCoordinates.length > 0 && (
            <Polyline
              points={routeCoordinates}
              width={6}
              color="#9990F5"
            />
          )}
          {/* 仅当起点坐标存在时渲染起点 Marker */}
          {startMarkerPos && (
            <Marker
              position={startMarkerPos}
              title="起点" // 标记标题
              icon={{ uri: Image.resolveAssetSource(require('../../assets/icon-start.png')).uri, width: 20, height: 20 }}
            />
          )}
          {/* 仅当终点坐标存在时渲染终点 Marker */}
          {endMarkerPos && (
            <Marker
              position={endMarkerPos}
              title="终点" // 标记标题
              icon={{ uri: Image.resolveAssetSource(require('../../assets/icon-end.png')).uri, width: 15, height: 15 }}
            />
          )}
          {/* --- 条件渲染结束 --- */}
        </MapView>
      </View>
    );
  },
);

// 样式定义
const styles = StyleSheet.create({
  container: {flex: 1}, // 容器占满父组件
  map: {flex: 1}, // 地图占满容器
});

// 导出组件
export default MapScreen;
