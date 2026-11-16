#!/usr/bin/env python3
"""
Test the complete authentication and patient workflow.
Verifies the fix for the "Authentication required" error on patient reports.
"""

import json
import requests
import sys
from datetime import datetime

BASE_URL = "http://localhost:3000"
TEST_EMAIL = "doctor@hospital.com"
TEST_PASSWORD = "demo123"
TEST_PATIENT_ID = "10001"

class AuthFlowTest:
    def __init__(self):
        self.session = requests.Session()
        self.results = []
        self.session_token = None
        
    def test(self, name, url, method="GET", body=None, expected_status=200, include_credentials=True):
        """Execute a single test"""
        print(f"\n{'='*60}")
        print(f"TEST: {name}")
        print(f"{'='*60}")
        
        try:
            full_url = f"{BASE_URL}{url}"
            print(f"Method: {method}")
            print(f"URL: {full_url}")
            
            if method == "GET":
                response = self.session.get(full_url)
            elif method == "POST":
                response = self.session.post(full_url, json=body)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            print(f"Status: {response.status_code}")
            
            # Check cookies
            if self.session.cookies:
                print(f"Cookies in session: {list(self.session.cookies.keys())}")
                if 'session_id' in self.session.cookies:
                    print("✓ session_id cookie present")
                else:
                    print("✗ session_id cookie MISSING")
            
            # Parse response
            try:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)[:200]}...")
            except:
                print(f"Response: {response.text[:200]}...")
            
            # Check result
            if response.status_code == expected_status:
                print(f"✓ PASS - Expected status {expected_status}")
                result = "PASS"
            else:
                print(f"✗ FAIL - Expected {expected_status}, got {response.status_code}")
                result = "FAIL"
            
            self.results.append({
                'test': name,
                'result': result,
                'status': response.status_code,
                'expected': expected_status
            })
            
            return response
        
        except Exception as e:
            print(f"✗ ERROR: {e}")
            self.results.append({
                'test': name,
                'result': 'ERROR',
                'error': str(e)
            })
            return None
    
    def run_all_tests(self):
        """Run complete authentication and patient workflow"""
        
        print("\n" + "="*60)
        print("CLARA PHASE 6.1 - AUTHENTICATION & PATIENT WORKFLOW TEST")
        print("="*60)
        print(f"Testing against: {BASE_URL}")
        print(f"Timestamp: {datetime.now().isoformat()}")
        
        # Test 1: Login
        login_body = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        login_response = self.test(
            "Test 1: Login with valid credentials",
            "/api/auth/login",
            method="POST",
            body=login_body,
            expected_status=200
        )
        
        if not login_response or login_response.status_code != 200:
            print("\n✗ Login failed - cannot proceed")
            return False
        
        # Verify session cookie was set
        if 'session_id' not in self.session.cookies:
            print("\n✗ session_id cookie NOT set by login - authentication will fail")
            self.results.append({
                'test': 'Session Cookie Check',
                'result': 'FAIL',
                'details': 'session_id cookie not set after login'
            })
        else:
            print(f"\n✓ session_id cookie set: {self.session.cookies.get('session_id')[:20]}...")
            self.results.append({
                'test': 'Session Cookie Check',
                'result': 'PASS'
            })
        
        # Test 2: Search for patient
        self.test(
            "Test 2: Search for patient",
            f"/api/patients/search?type=id&value={TEST_PATIENT_ID}",
            method="GET",
            expected_status=200
        )
        
        # Test 3: Get patient profile (THIS IS THE KEY TEST - should have credentials now)
        self.test(
            "Test 3: Get patient profile (CRITICAL TEST)",
            f"/api/patients/{TEST_PATIENT_ID}",
            method="GET",
            expected_status=200
        )
        
        # Test 4: Get schema
        self.test(
            "Test 4: Get database schema",
            "/api/schema",
            method="GET",
            expected_status=200
        )
        
        # Test 5: Chat endpoint
        chat_body = {
            "messages": [
                {"role": "user", "content": "How many patients are there?"}
            ]
        }
        self.test(
            "Test 5: Chat query",
            "/api/chat",
            method="POST",
            body=chat_body,
            expected_status=200
        )
        
        # Test 6: Logout
        self.test(
            "Test 6: Logout",
            "/api/auth/logout",
            method="POST",
            expected_status=200
        )
        
        # Test 7: Try patient API without session (should fail)
        self.session.cookies.clear()
        self.test(
            "Test 7: Access patient profile without authentication (should fail)",
            f"/api/patients/{TEST_PATIENT_ID}",
            method="GET",
            expected_status=401
        )
        
        # Print summary
        self._print_summary()
        
        # Return True if critical test (Test 3) passed
        for result in self.results:
            if 'CRITICAL' in result.get('test', ''):
                return result.get('result') == 'PASS'
        
        return True
    
    def _print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        
        passed = sum(1 for r in self.results if r.get('result') == 'PASS')
        failed = sum(1 for r in self.results if r.get('result') == 'FAIL')
        errors = sum(1 for r in self.results if r.get('result') == 'ERROR')
        total = len(self.results)
        
        for result in self.results:
            symbol = "✓" if result['result'] == 'PASS' else "✗"
            print(f"{symbol} {result['test']}: {result['result']}")
        
        print(f"\nTotal: {total} | Passed: {passed} | Failed: {failed} | Errors: {errors}")
        print(f"Success Rate: {passed}/{total} ({100*passed//total}%)")
        
        if failed > 0 or errors > 0:
            print("\n⚠ ISSUES DETECTED - See details above")
        else:
            print("\n✓ ALL TESTS PASSED")

if __name__ == "__main__":
    tester = AuthFlowTest()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
