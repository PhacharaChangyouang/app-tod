import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorage {
  static const _storage = FlutterSecureStorage();

  static const _accessTokenKey = 'accessToken';
  static const _refreshTokenKey = 'refreshToken';
  static const _userIdKey = 'userId';
  static const _userNameKey = 'userName';
  static const _userRoleKey = 'userRole';
  static const _userPhoneKey = 'userPhone';

  static Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _storage.write(key: _accessTokenKey, value: accessToken);
    await _storage.write(key: _refreshTokenKey, value: refreshToken);
  }

  static Future<String?> getAccessToken() =>
      _storage.read(key: _accessTokenKey);
  static Future<String?> getRefreshToken() =>
      _storage.read(key: _refreshTokenKey);

  static Future<void> saveUser({
    required String id,
    required String name,
    required String role,
    required String phone,
  }) async {
    await _storage.write(key: _userIdKey, value: id);
    await _storage.write(key: _userNameKey, value: name);
    await _storage.write(key: _userRoleKey, value: role);
    await _storage.write(key: _userPhoneKey, value: phone);
  }

  static Future<Map<String, String?>> getUser() async => {
        'id': await _storage.read(key: _userIdKey),
        'name': await _storage.read(key: _userNameKey),
        'role': await _storage.read(key: _userRoleKey),
        'phone': await _storage.read(key: _userPhoneKey),
      };

  static Future<void> clearAll() => _storage.deleteAll();
}
