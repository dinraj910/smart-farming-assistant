import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAlertStore, AlertType, AlertButton } from '../store/alertStore';
import Colors from '../constants/colors';

const { width } = Dimensions.get('window');

const TYPE_CONFIG = {
  success: {
    icon: 'check-circle' as const,
    badgeBg: Colors.brand[100] || '#dcfce7',
    badgeBorder: '#86efac',
    iconColor: Colors.brand[600] || '#15803d',
    primaryBtnBg: Colors.brand[600] || '#15803d',
    primaryBtnPressed: Colors.brand[700] || '#166534',
    accentText: 'SUCCESS',
  },
  warning: {
    icon: 'alert-triangle' as const,
    badgeBg: Colors.amber[100] || '#fef3c7',
    badgeBorder: '#fde68a',
    iconColor: Colors.amber[600] || '#d97706',
    primaryBtnBg: Colors.amber[600] || '#d97706',
    primaryBtnPressed: Colors.amber[700] || '#b45309',
    accentText: 'NOTICE',
  },
  error: {
    icon: 'alert-circle' as const,
    badgeBg: Colors.rose[100] || '#ffe4e6',
    badgeBorder: '#fecdd3',
    iconColor: Colors.rose[600] || '#e11d48',
    primaryBtnBg: Colors.rose[600] || '#e11d48',
    primaryBtnPressed: Colors.rose[700] || '#be123c',
    accentText: 'ATTENTION',
  },
  info: {
    icon: 'bell' as const,
    badgeBg: Colors.sky[100] || '#e0f2fe',
    badgeBorder: '#bae6fd',
    iconColor: Colors.sky[600] || '#0284c7',
    primaryBtnBg: Colors.brand[600] || '#15803d',
    primaryBtnPressed: Colors.brand[700] || '#166534',
    accentText: 'NOTIFICATION',
  },
};

export default function CustomAlertModal() {
  const { isOpen, title, message, type, buttons, cancelable, closeAlert } = useAlertStore();

  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      scaleAnim.setValue(0.88);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, scaleAnim, opacityAnim]);

  if (!isOpen) return null;

  const config = TYPE_CONFIG[type || 'info'];

  const handleBackdropPress = () => {
    if (cancelable) {
      closeAlert();
    }
  };

  const handleButtonPress = (btn: AlertButton) => {
    closeAlert();
    if (btn.onPress) {
      btn.onPress();
    }
  };

  // Determine button layout: if 2 buttons, render side by side; if 3+, stack them.
  const isMultiButton = buttons && buttons.length >= 2;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={() => {
        if (cancelable) closeAlert();
      }}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.alertCard,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                },
              ]}
            >
              {/* Top Accent Icon Badge */}
              <View style={[styles.iconWrap, { backgroundColor: config.badgeBg, borderColor: config.badgeBorder }]}>
                <Feather name={config.icon} size={30} color={config.iconColor} />
              </View>

              {/* Tag / Category */}
              <View style={styles.tagWrap}>
                <Text style={[styles.tagText, { color: config.iconColor }]}>{config.accentText}</Text>
              </View>

              {/* Title & Message */}
              <Text style={styles.titleText}>{title}</Text>
              {message ? <Text style={styles.messageText}>{message}</Text> : null}

              {/* Buttons Container */}
              <View style={[styles.buttonsContainer, isMultiButton && styles.multiButtonsRow]}>
                {buttons.map((btn, idx) => {
                  const isCancel = btn.style === 'cancel';
                  const isDestructive = btn.style === 'destructive';

                  let btnStyle: any = [styles.button, styles.primaryBtn, { backgroundColor: config.primaryBtnBg }];
                  let btnTextStyle: any = styles.primaryBtnText;

                  if (isCancel) {
                    btnStyle = [styles.button, styles.cancelBtn];
                    btnTextStyle = styles.cancelBtnText;
                  } else if (isDestructive) {
                    btnStyle = [styles.button, styles.destructiveBtn];
                    btnTextStyle = styles.destructiveBtnText;
                  }

                  return (
                    <TouchableOpacity
                      key={`${btn.text}-${idx}`}
                      style={[btnStyle, isMultiButton && styles.flexBtn]}
                      activeOpacity={0.82}
                      onPress={() => handleButtonPress(btn)}
                    >
                      <Text style={btnTextStyle} numberOfLines={1}>
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export { showAlert, closeAlert, CustomAlert } from '../store/alertStore';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 9999,
  },
  alertCard: {
    width: Math.min(width - 48, 380),
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
  },
  iconWrap: {
    width: 62,
    height: 62,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  tagWrap: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  messageText: {
    fontSize: 13.5,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
    paddingHorizontal: 4,
  },
  buttonsContainer: {
    width: '100%',
    gap: 10,
  },
  multiButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  flexBtn: {
    flex: 1,
  },
  primaryBtn: {
    backgroundColor: '#15803d',
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  destructiveBtn: {
    backgroundColor: '#e11d48',
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  destructiveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
