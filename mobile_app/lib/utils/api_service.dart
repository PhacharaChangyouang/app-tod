import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'secure_storage.dart';

class ApiService {
  static const _configuredBaseUrl = String.fromEnvironment('API_BASE_URL');
  static Future<bool>? _refreshInFlight;

  static String get _baseUrl {
    if (_configuredBaseUrl.isNotEmpty) {
      final value = _configuredBaseUrl.replaceFirst(RegExp(r'/$'), '');
      if (kReleaseMode && !value.startsWith('https://')) {
        throw StateError('API_BASE_URL must use HTTPS in release builds');
      }
      return value;
    }
    if (kReleaseMode) {
      throw StateError('API_BASE_URL is required in release builds');
    }
    return kIsWeb ? 'http://${Uri.base.host}:8080' : 'http://10.0.2.2:8080';
  }

  static Future<Map<String, String>> _authHeaders() async {
    final token = await SecureStorage.getAccessToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static dynamic _decode(http.Response response) {
    Map<String, dynamic> body;
    try {
      body = jsonDecode(response.body) as Map<String, dynamic>;
    } catch (_) {
      body = {'message': 'เซิร์ฟเวอร์ตอบกลับในรูปแบบที่ไม่ถูกต้อง'};
    }
    if (!body.containsKey('message') &&
        body['errors'] is List &&
        (body['errors'] as List).isNotEmpty) {
      body['message'] = body['errors'][0]['msg'] ?? 'ข้อมูลไม่ถูกต้อง';
    }
    return body;
  }

  static Future<bool> _doRefresh() async {
    final refreshToken = await SecureStorage.getRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) return false;
    try {
      final response = await http
          .post(
            Uri.parse('$_baseUrl/auth/refresh'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'refreshToken': refreshToken}),
          )
          .timeout(const Duration(seconds: 8));
      final body = _decode(response) as Map<String, dynamic>;
      if (response.statusCode >= 200 && response.statusCode < 300 &&
          body['accessToken'] is String && body['refreshToken'] is String) {
        await SecureStorage.saveTokens(
          accessToken: body['accessToken'] as String,
          refreshToken: body['refreshToken'] as String,
        );
        return true;
      }
      if (response.statusCode == 401) await SecureStorage.clearAll();
      return false;
    } catch (_) {
      return false;
    }
  }

  static Future<bool> _refreshAccessToken() {
    final active = _refreshInFlight;
    if (active != null) return active;
    final operation = _doRefresh();
    _refreshInFlight = operation;
    operation.whenComplete(() => _refreshInFlight = null);
    return operation;
  }

  static Future<http.Response> _authorizedRequest(
    String method,
    String path, {
    Map<String, dynamic>? body,
    bool retry = true,
  }) async {
    final request = http.Request(method, Uri.parse('$_baseUrl$path'));
    request.headers.addAll(await _authHeaders());
    if (body != null) request.body = jsonEncode(body);
    final response = await http.Response.fromStream(
      await request.send().timeout(const Duration(seconds: 12)),
    );
    if (response.statusCode == 401 && retry && await _refreshAccessToken()) {
      return _authorizedRequest(method, path, body: body, retry: false);
    }
    return response;
  }

  // ---------- AUTH ----------
  static Future<Map<String, dynamic>> loginWithPassword(
    String identifier,
    String password,
  ) async {
    final res = await http
        .post(
          Uri.parse('$_baseUrl/auth/login-password'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'identifier': identifier, 'password': password}),
        )
        .timeout(const Duration(seconds: 8));
    return _decode(res);
  }

  static Future<void> logout() async {
    final token = await SecureStorage.getRefreshToken();
    try {
      await http
          .post(
            Uri.parse('$_baseUrl/auth/logout'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'refreshToken': token}),
          )
          .timeout(const Duration(seconds: 8));
    } finally {
      await SecureStorage.clearAll();
    }
  }

  // ---------- REMINDERS ----------
  static Future<List<dynamic>> getReminders() async {
    final res = await _authorizedRequest('GET', '/api/reminders');
    final body = _decode(res) as Map<String, dynamic>;
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(body['message'] ?? 'ไม่สามารถโหลดรายการยาได้');
    }
    return body['data'] ?? [];
  }

  static Future<Map<String, dynamic>> createReminder({
    required String medicineName,
    required String dosage,
    required String reminderTime,
    required List<String> daysOfWeek,
  }) async {
    final res = await _authorizedRequest(
      'POST',
      '/api/reminders',
      body: {
        'medicine_name': medicineName,
        'dosage': dosage,
        'reminder_time': reminderTime,
        'frequency': daysOfWeek.length == 7 ? 'daily' : 'weekly',
        'days_of_week': daysOfWeek,
      },
    );
    final body = _decode(res) as Map<String, dynamic>;
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(body['message'] ?? 'ไม่สามารถเพิ่มยาได้');
    }
    return body;
  }

  static Future<Map<String, dynamic>> deleteReminder(String id) async {
    final res = await _authorizedRequest('DELETE', '/api/reminders/$id');
    return _decode(res) as Map<String, dynamic>;
  }

  // ---------- SOS / NOTIFICATIONS ----------
  static Future<Map<String, dynamic>> sendSos() async {
    final res = await _authorizedRequest(
      'POST',
      '/api/notifications/emergency',
      body: {
        'message': 'ผู้สูงอายุกดปุ่ม SOS ต้องการความช่วยเหลือทันที!',
      },
    );
    return _decode(res);
  }

  static Future<List<dynamic>> getNotifications() async {
    final res = await _authorizedRequest('GET', '/api/notifications');
    final body = _decode(res) as Map<String, dynamic>;
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(body['message'] ?? 'ไม่สามารถโหลดประวัติได้');
    }
    return body['data'] ?? [];
  }

  static Future<List<dynamic>> getFamilyConnections() async {
    final res = await _authorizedRequest('GET', '/family/connections');
    final body = _decode(res) as Map<String, dynamic>;
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(body['message'] ?? 'ไม่สามารถโหลดคนในครอบครัวได้');
    }
    return body['data'] ?? [];
  }

  static Future<Map<String, dynamic>> connectFamily(String phone) async {
    final res = await _authorizedRequest('POST', '/family/connections', body: {'phone': phone});
    return _decode(res);
  }

  static Future<Map<String, dynamic>> updateFamilyConnection(
    String id,
    String status,
  ) async {
    final res = await _authorizedRequest('PATCH', '/family/connections/$id', body: {'status': status});
    return _decode(res);
  }
}
