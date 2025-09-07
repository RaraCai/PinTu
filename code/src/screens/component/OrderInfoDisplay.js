import React from "react";
import{
    View,
    Text,
    StyleSheet,
    Image,
}from "react-native";

const OrderInfoDisplay = ({order, style}) => {
    return(
        <View style={[styles.cardContainer, style]}>
            {/* 上方：路线信息 */}
            <View style={{flexDirection: "row", alignItems: "center", marginBottom: 10}}>
                <Image 
                    source={require('../../assets/white-start-dots-end.png')}
                    style={{width: 12, height: 34, marginTop: 5}}
                />
                <View style={{flexDirection: "column", marginLeft: 10, gap: 8, alignItems: "left",}}>
                    <Text style={styles.cardText}>{order.origin_name}</Text>
                    <Text style={styles.cardText}>{order.destination_name}</Text>
                </View>
            </View>
            {/* 下方：价格和发车时间信息 */}
            <View style={{flexDirection: "row", justifyContent: "space-between", alignItems: "center"}}>    
                {/* 价格框 */}
                <View style={styles.priceContainer}>
                    <Image
                        source={require('../../assets/white-money.png')}
                        style={{width: 18, height: 18}} 
                    />
                    <Text style={styles.cardText}>总价：{order.cost}元</Text>
                </View>
                {/* 发车时间 */}
                <Text style={styles.cardText}>发车时间：{order.departure_time}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({ 
    cardContainer: {
        backgroundColor:'#877EF2',
        paddingHorizontal: 25,    
        paddingVertical: 15,
    },
    cardText: {
        color: '#fff',
        fontSize: 14,
    },
    priceContainer:{
        borderWidth: 1,
        borderColor: '#fff',
        borderRadius:15,
        flexDirection: 'row',
        gap: 5,
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        minWidth: 100,
    },
});

export default OrderInfoDisplay;