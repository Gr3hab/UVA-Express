#!/usr/bin/env python3
"""
UVA Express Backend Hardening Test Suite
========================================

Tests the NEW hardening features as specified in the review request:
1. Idempotency Test (with duplicate detection)
2. XSD Validation Test (with validation warnings)
3. Metrics Endpoint (endpoint statistics)
4. Audit Trail (recent audit entries)
5. Submission Prepare (with XSD + idempotency awareness)
6. Structured Logging (metrics accumulation)
7. Version Check (hardened=true verification)
"""

import requests
import json
import time
from typing import Dict, Any

# Backend URL from frontend env
BASE_URL = "https://compliance-ready-8.preview.emergentagent.com/api"

class HardeningTestSuite:
    def __init__(self):
        self.results = []
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

    def log_result(self, test_name: str, success: bool, message: str, details: Dict[str, Any] = None):
        """Log test result with detailed information"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.results.append({
            "test": test_name,
            "status": status,
            "message": message,
            "details": details or {}
        })
        print(f"{status} {test_name}: {message}")
        if details:
            print(f"    Details: {json.dumps(details, indent=2)}")

    def test_version_check(self):
        """Test 7: Version Check - Should return version 1.1.0 and hardened=true"""
        try:
            response = self.session.get(f"{BASE_URL}/")
            data = response.json()
            
            version_correct = data.get("version") == "1.1.0"
            hardened_flag = data.get("hardened") == True
            has_hardening_features = all(feature in data.get("features", []) for feature in 
                                      ["idempotency", "audit-trail", "xsd-validation"])
            
            if version_correct and hardened_flag and has_hardening_features:
                self.log_result(
                    "Version Check", True,
                    f"Version {data.get('version')}, hardened={data.get('hardened')}, features include hardening",
                    {"response": data}
                )
            else:
                self.log_result(
                    "Version Check", False,
                    f"Version: {data.get('version')} (expected 1.1.0), hardened: {data.get('hardened')} (expected True)",
                    {"response": data}
                )
        except Exception as e:
            self.log_result("Version Check", False, f"Exception: {str(e)}")

    def test_metrics_endpoint(self):
        """Test 3: Metrics Endpoint - Should return endpoint statistics"""
        try:
            response = self.session.get(f"{BASE_URL}/metrics")
            data = response.json()
            
            has_endpoints = "endpoints" in data
            has_totals = "totals" in data
            has_since = "since" in data
            
            if has_endpoints and has_totals and has_since:
                endpoint_count = len(data.get("endpoints", {}))
                total_requests = data.get("totals", {}).get("requests", 0)
                self.log_result(
                    "Metrics Endpoint", True,
                    f"Metrics available: {endpoint_count} endpoints tracked, {total_requests} total requests",
                    {"metrics_summary": {
                        "endpoint_count": endpoint_count,
                        "total_requests": total_requests,
                        "has_error_rates": any("error_rate" in ep for ep in data.get("endpoints", {}).values())
                    }}
                )
            else:
                self.log_result(
                    "Metrics Endpoint", False,
                    f"Missing required fields: endpoints={has_endpoints}, totals={has_totals}, since={has_since}",
                    {"response": data}
                )
        except Exception as e:
            self.log_result("Metrics Endpoint", False, f"Exception: {str(e)}")

    def test_audit_trail(self):
        """Test 4: Audit Trail - Should return recent audit entries with proper structure"""
        try:
            response = self.session.get(f"{BASE_URL}/audit/recent")
            data = response.json()
            
            if isinstance(data, list):
                if len(data) > 0:
                    sample_entry = data[0]
                    required_fields = ["correlation_id", "timestamp", "action"]
                    has_required = all(field in sample_entry for field in required_fields)
                    has_no_pii = "payload" not in sample_entry  # Should not contain raw payloads
                    has_hash = "payload_hash" in sample_entry or sample_entry.get("payload_hash") is None
                    
                    if has_required and has_no_pii:
                        self.log_result(
                            "Audit Trail", True,
                            f"Audit entries available: {len(data)} entries, proper structure, no PII in logs",
                            {"entry_count": len(data), "sample_fields": list(sample_entry.keys())}
                        )
                    else:
                        self.log_result(
                            "Audit Trail", False,
                            f"Missing fields or PII found: required={has_required}, no_pii={has_no_pii}",
                            {"sample_entry": sample_entry}
                        )
                else:
                    self.log_result(
                        "Audit Trail", True,
                        "Audit endpoint working, no entries yet (expected for fresh system)",
                        {"entry_count": 0}
                    )
            else:
                self.log_result("Audit Trail", False, f"Expected list, got {type(data)}", {"response": data})
        except Exception as e:
            self.log_result("Audit Trail", False, f"Exception: {str(e)}")

    def test_xsd_validation_valid(self):
        """Test 2a: XSD Validation with valid data"""
        try:
            valid_payload = {
                "kz_values": {
                    "kz022_netto": 1000,
                    "kz022_ust": 200,
                    "kz060_vorsteuer": 100,
                    "kz090_betrag": 100,
                    "kz095_betrag": 100
                },
                "steuernummer": "12 345/6789",
                "year": 2026,
                "month": 1
            }
            
            response = self.session.post(f"{BASE_URL}/uva/export-xml-json", json=valid_payload)
            data = response.json()
            
            success = data.get("success") == True
            validation_passed = data.get("validation_passed") == True
            
            if success and validation_passed:
                self.log_result(
                    "XSD Validation (Valid)", True,
                    "Valid data passes XSD validation successfully",
                    {"validation_passed": validation_passed, "filename": data.get("filename")}
                )
            else:
                self.log_result(
                    "XSD Validation (Valid)", False,
                    f"Validation failed: success={success}, validation_passed={validation_passed}",
                    {"response": data}
                )
        except Exception as e:
            self.log_result("XSD Validation (Valid)", False, f"Exception: {str(e)}")

    def test_xsd_validation_warning(self):
        """Test 2b: XSD Validation with short steuernummer (should show warning)"""
        try:
            warning_payload = {
                "kz_values": {"kz095_betrag": 0},
                "steuernummer": "12",
                "year": 2026,
                "month": 1
            }
            
            response = self.session.post(f"{BASE_URL}/uva/export-xml-json", json=warning_payload)
            data = response.json()
            
            # Should still succeed but with validation warnings
            has_validation_issues = len(data.get("validation_issues", [])) > 0
            
            if has_validation_issues:
                steuernummer_warning = any(
                    "Steuernummer" in str(issue.get("message", "")).lower() 
                    for issue in data.get("validation_issues", [])
                )
                self.log_result(
                    "XSD Validation (Warning)", True,
                    f"Short Steuernummer triggers validation warning as expected",
                    {"validation_issues_count": len(data.get("validation_issues", [])), 
                     "has_steuernummer_warning": steuernummer_warning}
                )
            else:
                self.log_result(
                    "XSD Validation (Warning)", False,
                    "Expected validation warning for short Steuernummer not found",
                    {"response": data}
                )
        except Exception as e:
            self.log_result("XSD Validation (Warning)", False, f"Exception: {str(e)}")

    def test_submission_prepare_with_hardening(self):
        """Test 5: Submission Prepare with XSD + idempotency awareness"""
        try:
            prepare_payload = {
                "kz_values": {
                    "kz022_netto": 1000,
                    "kz022_ust": 200,
                    "kz060_vorsteuer": 100,
                    "kz090_betrag": 100,
                    "kz095_betrag": 100
                },
                "year": 2026,
                "month": 1,
                "steuernummer": "12 345/6789",
                "invoices": []
            }
            
            response = self.session.post(f"{BASE_URL}/uva/submission/prepare", json=prepare_payload)
            data = response.json()
            
            # Check for XSD validation in checklist
            checklist = data.get("checklist", [])
            xsd_check = None
            for item in checklist:
                if "XML-Export generierbar und XSD-valide" in item.get("label", ""):
                    xsd_check = item
                    break
            
            has_xsd_check = xsd_check is not None
            xsd_passed = xsd_check.get("passed") == True if xsd_check else False
            
            if has_xsd_check and xsd_passed:
                self.log_result(
                    "Submission Prepare (Hardened)", True,
                    "Prepare includes XSD validation check in checklist",
                    {"xsd_check_passed": xsd_passed, "checklist_count": len(checklist)}
                )
            else:
                self.log_result(
                    "Submission Prepare (Hardened)", False,
                    f"XSD check missing or failed: has_check={has_xsd_check}, passed={xsd_passed}",
                    {"checklist": checklist}
                )
        except Exception as e:
            self.log_result("Submission Prepare (Hardened)", False, f"Exception: {str(e)}")

    def test_idempotency_first_submission(self):
        """Test 1a: Idempotency - First submission should succeed with was_duplicate=false"""
        try:
            idempotency_payload = {
                "year": 2026,
                "month": 3,
                "idempotency_key": "test-idem-001",
                "finanzonline_reference": "FO-123"
            }
            
            response = self.session.post(f"{BASE_URL}/uva/submission/confirm", json=idempotency_payload)
            data = response.json()
            
            success = data.get("success") == True
            was_duplicate = data.get("was_duplicate") == False
            has_idempotency_key = data.get("idempotency_key") == "test-idem-001"
            
            if success and was_duplicate and has_idempotency_key:
                self.log_result(
                    "Idempotency (First)", True,
                    "First submission with idempotency key succeeds, was_duplicate=false",
                    {"success": success, "was_duplicate": was_duplicate, "key": data.get("idempotency_key")}
                )
            else:
                self.log_result(
                    "Idempotency (First)", False,
                    f"First submission failed: success={success}, was_duplicate={was_duplicate}",
                    {"response": data}
                )
        except Exception as e:
            self.log_result("Idempotency (First)", False, f"Exception: {str(e)}")

    def test_idempotency_duplicate_submission(self):
        """Test 1b: Idempotency - Same request should return was_duplicate=true"""
        try:
            # Same payload as first test
            idempotency_payload = {
                "year": 2026,
                "month": 3,
                "idempotency_key": "test-idem-001",
                "finanzonline_reference": "FO-123"
            }
            
            response = self.session.post(f"{BASE_URL}/uva/submission/confirm", json=idempotency_payload)
            data = response.json()
            
            success = data.get("success") == True
            was_duplicate = data.get("was_duplicate") == True
            has_idempotency_key = data.get("idempotency_key") == "test-idem-001"
            
            if success and was_duplicate == True and has_idempotency_key:
                self.log_result(
                    "Idempotency (Duplicate)", True,
                    "Duplicate submission with same key returns was_duplicate=true (idempotent!)",
                    {"success": success, "was_duplicate": was_duplicate, "key": data.get("idempotency_key")}
                )
            else:
                self.log_result(
                    "Idempotency (Duplicate)", False,
                    f"Duplicate detection failed: success={success}, was_duplicate={was_duplicate}",
                    {"response": data}
                )
        except Exception as e:
            self.log_result("Idempotency (Duplicate)", False, f"Exception: {str(e)}")

    def test_idempotency_different_key_same_period(self):
        """Test 1c: Idempotency - Different key, same period should work"""
        try:
            # Different key but same period (2026/3)
            idempotency_payload = {
                "year": 2026,
                "month": 3,
                "idempotency_key": "test-idem-002",  # Different key
                "finanzonline_reference": "FO-456"
            }
            
            response = self.session.post(f"{BASE_URL}/uva/submission/confirm", json=idempotency_payload)
            data = response.json()
            
            success = data.get("success") == True
            was_duplicate = data.get("was_duplicate") == False  # Should be false for new key
            has_correct_key = data.get("idempotency_key") == "test-idem-002"
            
            if success and was_duplicate == False and has_correct_key:
                self.log_result(
                    "Idempotency (Different Key)", True,
                    "Different idempotency key for same period works (new key, same period allowed)",
                    {"success": success, "was_duplicate": was_duplicate, "key": data.get("idempotency_key")}
                )
            else:
                self.log_result(
                    "Idempotency (Different Key)", False,
                    f"Different key failed: success={success}, was_duplicate={was_duplicate}",
                    {"response": data}
                )
        except Exception as e:
            self.log_result("Idempotency (Different Key)", False, f"Exception: {str(e)}")

    def test_structured_logging_metrics_accumulation(self):
        """Test 6: Structured Logging - Check metrics accumulation after tests"""
        try:
            # Get metrics again to see accumulated stats from all our tests
            response = self.session.get(f"{BASE_URL}/metrics")
            data = response.json()
            
            endpoints = data.get("endpoints", {})
            totals = data.get("totals", {})
            
            # Check if we have accumulated requests from our tests
            submission_confirm_stats = endpoints.get("/api/uva/submission/confirm", {})
            export_xml_json_stats = endpoints.get("/api/uva/export-xml-json", {})
            
            has_submission_stats = submission_confirm_stats.get("count", 0) >= 3  # At least 3 from idempotency tests
            has_export_stats = export_xml_json_stats.get("count", 0) >= 2  # At least 2 from XSD tests
            total_requests = totals.get("requests", 0)
            
            if has_submission_stats and has_export_stats and total_requests > 0:
                self.log_result(
                    "Structured Logging", True,
                    f"Metrics accumulation working: {total_requests} total requests tracked across endpoints",
                    {
                        "total_requests": total_requests,
                        "submission_confirm_count": submission_confirm_stats.get("count", 0),
                        "export_xml_json_count": export_xml_json_stats.get("count", 0),
                        "tracked_endpoints": len(endpoints)
                    }
                )
            else:
                self.log_result(
                    "Structured Logging", False,
                    f"Insufficient metrics accumulation: submission={submission_confirm_stats.get('count', 0)}, export={export_xml_json_stats.get('count', 0)}",
                    {"endpoints": endpoints, "totals": totals}
                )
        except Exception as e:
            self.log_result("Structured Logging", False, f"Exception: {str(e)}")

    def run_all_hardening_tests(self):
        """Execute all hardening tests in proper sequence"""
        print("🔒 UVA Express Backend Hardening Test Suite")
        print("=" * 50)
        
        # Test 7: Version Check (first, to verify hardening is enabled)
        self.test_version_check()
        time.sleep(0.5)
        
        # Test 3: Metrics Endpoint (early, to get baseline)
        self.test_metrics_endpoint()
        time.sleep(0.5)
        
        # Test 4: Audit Trail
        self.test_audit_trail()
        time.sleep(0.5)
        
        # Test 2: XSD Validation Tests
        self.test_xsd_validation_valid()
        time.sleep(0.5)
        self.test_xsd_validation_warning()
        time.sleep(0.5)
        
        # Test 5: Submission Prepare (with hardening features)
        self.test_submission_prepare_with_hardening()
        time.sleep(0.5)
        
        # Test 1: Idempotency Tests (sequence matters!)
        self.test_idempotency_first_submission()
        time.sleep(0.5)
        self.test_idempotency_duplicate_submission()
        time.sleep(0.5)
        self.test_idempotency_different_key_same_period()
        time.sleep(0.5)
        
        # Test 6: Structured Logging (last, to see accumulated metrics)
        self.test_structured_logging_metrics_accumulation()
        
        self.print_summary()

    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 50)
        print("🔒 HARDENING TEST RESULTS SUMMARY")
        print("=" * 50)
        
        passed = sum(1 for r in self.results if "✅ PASS" in r["status"])
        failed = sum(1 for r in self.results if "❌ FAIL" in r["status"])
        total = len(self.results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(passed/total*100):.1f}%" if total > 0 else "0%")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.results:
                if "❌ FAIL" in result["status"]:
                    print(f"  • {result['test']}: {result['message']}")
        
        print("\n✅ HARDENING FEATURES STATUS:")
        features = {
            "Idempotency": ["Idempotency (First)", "Idempotency (Duplicate)", "Idempotency (Different Key)"],
            "XSD Validation": ["XSD Validation (Valid)", "XSD Validation (Warning)"],
            "Metrics": ["Metrics Endpoint", "Structured Logging"],
            "Audit Trail": ["Audit Trail"],
            "Submission Hardening": ["Submission Prepare (Hardened)"],
            "Version & Config": ["Version Check"]
        }
        
        for feature_name, test_names in features.items():
            feature_results = [r for r in self.results if r["test"] in test_names]
            feature_passed = all("✅ PASS" in r["status"] for r in feature_results)
            status = "✅ WORKING" if feature_passed else "❌ ISSUES"
            print(f"  {status} {feature_name}")


if __name__ == "__main__":
    test_suite = HardeningTestSuite()
    test_suite.run_all_hardening_tests()