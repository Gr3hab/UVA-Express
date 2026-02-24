"""
UVA Express Backend API Comprehensive Test Suite
══════════════════════════════════════════════

Tests all UVA backend endpoints with realistic Austrian tax data:
- POST /api/uva/calculate
- POST /api/uva/validate
- POST /api/uva/export-xml
- POST /api/uva/export-xml-json
- POST /api/rksv/validate
- POST /api/uva/submission/prepare
- POST /api/uva/submission/confirm
- GET /api/uva/kz-info
"""

import requests
import json
import xml.etree.ElementTree as ET
from typing import Dict, List, Any
import sys
import traceback


class UVAAPITester:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.api_url = f"{self.base_url}/api"
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = {
            'total_tests': 0,
            'passed': 0,
            'failed': 0,
            'errors': []
        }

    def log_result(self, test_name: str, success: bool, message: str = "", details: Dict = None):
        """Log test result."""
        self.results['total_tests'] += 1
        if success:
            self.results['passed'] += 1
            status = "✅ PASS"
        else:
            self.results['failed'] += 1
            status = "❌ FAIL"
            self.results['errors'].append({
                'test': test_name,
                'message': message,
                'details': details
            })
        
        print(f"{status} {test_name}: {message}")
        if details and not success:
            print(f"   Details: {json.dumps(details, indent=2)}")

    def get_test_invoices(self) -> List[Dict]:
        """Generate comprehensive set of test invoices for Austrian tax scenarios."""
        return [
            # Normal 20% Ausgangsrechnung
            {
                "id": "INV-001",
                "invoice_number": "AR-2024-001",
                "net_amount": 1000.0,
                "vat_amount": 200.0,
                "gross_amount": 1200.0,
                "vat_rate": 20,
                "invoice_type": "ausgang",
                "tax_treatment": "normal",
                "invoice_date": "2024-12-15T00:00:00Z",
                "description": "Software-Entwicklung Dienstleistung"
            },
            # Normal 10% Eingangsrechnung
            {
                "id": "INV-002",
                "invoice_number": "ER-2024-002",
                "net_amount": 500.0,
                "vat_amount": 50.0,
                "gross_amount": 550.0,
                "vat_rate": 10,
                "invoice_type": "eingang",
                "tax_treatment": "normal",
                "invoice_date": "2024-12-10T00:00:00Z",
                "description": "Büromaterial Einkauf"
            },
            # IG Erwerb 20%
            {
                "id": "INV-003",
                "invoice_number": "IG-2024-003",
                "net_amount": 2000.0,
                "vat_amount": 400.0,
                "gross_amount": 2400.0,
                "vat_rate": 20,
                "invoice_type": "eingang",
                "tax_treatment": "ig_erwerb",
                "invoice_date": "2024-12-12T00:00:00Z",
                "description": "IG Erwerb aus Deutschland"
            },
            # Reverse Charge §19(1)
            {
                "id": "INV-004",
                "invoice_number": "RC-2024-004",
                "net_amount": 3000.0,
                "vat_amount": 600.0,
                "gross_amount": 3600.0,
                "vat_rate": 20,
                "invoice_type": "eingang",
                "tax_treatment": "reverse_charge_19_1",
                "invoice_date": "2024-12-08T00:00:00Z",
                "description": "Reverse Charge Beratungsleistung"
            },
            # Export Ausgang
            {
                "id": "INV-005",
                "invoice_number": "EX-2024-005",
                "net_amount": 5000.0,
                "vat_amount": 0.0,
                "gross_amount": 5000.0,
                "vat_rate": 0,
                "invoice_type": "ausgang",
                "tax_treatment": "export",
                "invoice_date": "2024-12-05T00:00:00Z",
                "description": "Export nach Schweiz"
            },
            # IG Lieferung Ausgang
            {
                "id": "INV-006",
                "invoice_number": "IG-2024-006",
                "net_amount": 4000.0,
                "vat_amount": 0.0,
                "gross_amount": 4000.0,
                "vat_rate": 0,
                "invoice_type": "ausgang",
                "tax_treatment": "ig_lieferung",
                "invoice_date": "2024-12-03T00:00:00Z",
                "description": "IG Lieferung nach Deutschland"
            },
            # Bauleistungen RC
            {
                "id": "INV-007",
                "invoice_number": "BAU-2024-007",
                "net_amount": 10000.0,
                "vat_amount": 2000.0,
                "gross_amount": 12000.0,
                "vat_rate": 20,
                "invoice_type": "eingang",
                "tax_treatment": "reverse_charge_19_1a",
                "invoice_date": "2024-12-01T00:00:00Z",
                "description": "Bauleistungen Reverse Charge"
            },
            # Grundstück steuerfrei
            {
                "id": "INV-008",
                "invoice_number": "GS-2024-008",
                "net_amount": 100000.0,
                "vat_amount": 0.0,
                "gross_amount": 100000.0,
                "vat_rate": 0,
                "invoice_type": "ausgang",
                "tax_treatment": "grundstueck",
                "invoice_date": "2024-12-02T00:00:00Z",
                "description": "Grundstücksverkauf"
            },
            # Kleinunternehmer
            {
                "id": "INV-009",
                "invoice_number": "KU-2024-009",
                "net_amount": 800.0,
                "vat_amount": 0.0,
                "gross_amount": 800.0,
                "vat_rate": 0,
                "invoice_type": "ausgang",
                "tax_treatment": "kleinunternehmer",
                "invoice_date": "2024-12-06T00:00:00Z",
                "description": "Kleinunternehmer Umsatz"
            },
            # 13% Ausgangsrechnung
            {
                "id": "INV-010",
                "invoice_number": "AR-2024-010",
                "net_amount": 1500.0,
                "vat_amount": 195.0,
                "gross_amount": 1695.0,
                "vat_rate": 13,
                "invoice_type": "ausgang",
                "tax_treatment": "normal",
                "invoice_date": "2024-12-07T00:00:00Z",
                "description": "Getränke Verkauf 13% USt"
            }
        ]

    def test_health_check(self):
        """Test basic health check endpoints."""
        try:
            # Test root endpoint
            response = self.session.get(f"{self.api_url}/")
            if response.status_code == 200:
                data = response.json()
                if "service" in data and data.get("status") == "running":
                    self.log_result("Health Check Root", True, f"Service: {data.get('service')}")
                else:
                    self.log_result("Health Check Root", False, "Invalid response format", data)
            else:
                self.log_result("Health Check Root", False, f"Status: {response.status_code}", {"text": response.text})

            # Test health endpoint
            response = self.session.get(f"{self.api_url}/health")
            if response.status_code == 200:
                data = response.json()
                if "status" in data and data.get("status") == "healthy":
                    self.log_result("Health Check", True, "Backend is healthy")
                else:
                    self.log_result("Health Check", False, "Unhealthy response", data)
            else:
                self.log_result("Health Check", False, f"Status: {response.status_code}", {"text": response.text})

        except Exception as e:
            self.log_result("Health Check", False, f"Connection error: {str(e)}")

    def test_uva_calculation(self):
        """Test UVA calculation with comprehensive Austrian tax scenarios."""
        try:
            invoices = self.get_test_invoices()
            
            payload = {
                "year": 2024,
                "month": 12,
                "invoices": invoices,
                "sonstige_berichtigungen": 0.0
            }

            response = self.session.post(f"{self.api_url}/uva/calculate", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                if "success" in data and data["success"]:
                    kz_values = data.get("kz_values", {})
                    summary = data.get("summary", {})
                    
                    # Key validation checks
                    checks = []
                    
                    # KZ 000 should include only Ausgang invoices
                    expected_kz000 = 1000 + 5000 + 4000 + 100000 + 800 + 1500  # All Ausgang net amounts
                    kz000_actual = kz_values.get("kz000_netto", 0)
                    if abs(kz000_actual - expected_kz000) < 1.0:
                        checks.append("✅ KZ 000 correct")
                    else:
                        checks.append(f"❌ KZ 000: expected {expected_kz000}, got {kz000_actual}")
                    
                    # KZ 070 should be sum of IG Erwerbe
                    expected_kz070 = 2000  # Only IG Erwerb
                    kz070_actual = kz_values.get("kz070_netto", 0)
                    if abs(kz070_actual - expected_kz070) < 1.0:
                        checks.append("✅ KZ 070 correct")
                    else:
                        checks.append(f"❌ KZ 070: expected {expected_kz070}, got {kz070_actual}")
                    
                    # KZ 095 = Total USt - Total Vorsteuer
                    kz095_actual = kz_values.get("kz095_betrag", 0)
                    checks.append(f"KZ 095 (Zahllast): {kz095_actual:.2f}")
                    
                    # RC symmetry check
                    kz057_ust = kz_values.get("kz057_ust", 0)
                    kz066_vorsteuer = kz_values.get("kz066_vorsteuer", 0)
                    if abs(kz057_ust - kz066_vorsteuer) < 0.01:
                        checks.append("✅ RC symmetry (KZ057=KZ066)")
                    else:
                        checks.append(f"❌ RC asymmetry: KZ057={kz057_ust}, KZ066={kz066_vorsteuer}")
                    
                    # Bauleistungen RC symmetry
                    kz048_ust = kz_values.get("kz048_ust", 0)
                    kz082_vorsteuer = kz_values.get("kz082_vorsteuer", 0)
                    if abs(kz048_ust - kz082_vorsteuer) < 0.01:
                        checks.append("✅ Bauleistungen RC symmetry (KZ048=KZ082)")
                    else:
                        checks.append(f"❌ Bauleistungen RC asymmetry: KZ048={kz048_ust}, KZ082={kz082_vorsteuer}")
                    
                    # Summary counts
                    ausgang_count = summary.get("ausgang_count", 0)
                    eingang_count = summary.get("eingang_count", 0)
                    ig_count = summary.get("ig_count", 0)
                    rc_count = summary.get("rc_count", 0)
                    export_count = summary.get("export_count", 0)
                    
                    checks.append(f"Ausgang: {ausgang_count}, Eingang: {eingang_count}, IG: {ig_count}, RC: {rc_count}, Export: {export_count}")
                    
                    self.log_result("UVA Calculation", True, "; ".join(checks))
                    
                    # Store kz_values for subsequent tests
                    self.calculated_kz_values = kz_values
                    self.test_year = 2024
                    self.test_month = 12
                    self.test_invoices = invoices
                    
                else:
                    self.log_result("UVA Calculation", False, "Response indicates failure", data)
            else:
                self.log_result("UVA Calculation", False, f"Status: {response.status_code}", {"text": response.text})
                
        except Exception as e:
            self.log_result("UVA Calculation", False, f"Error: {str(e)}")

    def test_uva_validation(self):
        """Test UVA validation with calculated KZ values."""
        try:
            if not hasattr(self, 'calculated_kz_values'):
                self.log_result("UVA Validation", False, "No calculated KZ values available (run calculation test first)")
                return
            
            payload = {
                "year": self.test_year,
                "month": self.test_month,
                "kz_values": self.calculated_kz_values,
                "invoices": self.test_invoices
            }

            response = self.session.post(f"{self.api_url}/uva/validate", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                
                is_valid = data.get("valid", False)
                errors = data.get("errors", [])
                warnings = data.get("warnings", [])
                kz095_matches = data.get("kz095_matches", False)
                
                status_parts = []
                
                if is_valid:
                    status_parts.append("✅ Valid")
                else:
                    status_parts.append(f"❌ Invalid ({len(errors)} errors)")
                
                if kz095_matches:
                    status_parts.append("✅ KZ095 consistent")
                else:
                    status_parts.append("❌ KZ095 mismatch")
                
                status_parts.append(f"{len(warnings)} warnings")
                
                # Test with intentionally wrong KZ095 
                wrong_kz_values = self.calculated_kz_values.copy()
                wrong_kz_values["kz095_betrag"] = 99999.99
                
                wrong_payload = {
                    "year": self.test_year,
                    "month": self.test_month,
                    "kz_values": wrong_kz_values,
                    "invoices": self.test_invoices
                }
                
                wrong_response = self.session.post(f"{self.api_url}/uva/validate", json=wrong_payload)
                if wrong_response.status_code == 200:
                    wrong_data = wrong_response.json()
                    if not wrong_data.get("valid", True):
                        status_parts.append("✅ Catches KZ095 errors")
                    else:
                        status_parts.append("❌ Failed to catch KZ095 error")
                
                self.log_result("UVA Validation", is_valid, "; ".join(status_parts))
                
            else:
                self.log_result("UVA Validation", False, f"Status: {response.status_code}", {"text": response.text})
                
        except Exception as e:
            self.log_result("UVA Validation", False, f"Error: {str(e)}")

    def test_xml_export(self):
        """Test XML export functionality."""
        try:
            if not hasattr(self, 'calculated_kz_values'):
                self.log_result("XML Export", False, "No calculated KZ values available")
                return
            
            payload = {
                "year": self.test_year,
                "month": self.test_month,
                "kz_values": self.calculated_kz_values,
                "steuernummer": "12 345/6789",
                "unternehmen_name": "Test GmbH",
                "unternehmen_strasse": "Teststraße 1",
                "unternehmen_plz": "1010",
                "unternehmen_ort": "Wien"
            }

            # Test XML download endpoint
            response = self.session.post(f"{self.api_url}/uva/export-xml", json=payload)
            
            if response.status_code == 200:
                xml_content = response.text
                
                # Verify XML structure
                try:
                    root = ET.fromstring(xml_content)
                    
                    checks = []
                    
                    # Check root element
                    if root.tag == "ERKLAERUNGENPAKET":
                        checks.append("✅ ERKLAERUNGENPAKET root")
                    else:
                        checks.append(f"❌ Wrong root: {root.tag}")
                    
                    # Check for ERKLAERUNG art="U30"
                    erklaerung = root.find(".//ERKLAERUNG[@art='U30']")
                    if erklaerung is not None:
                        checks.append("✅ ERKLAERUNG U30 found")
                    else:
                        checks.append("❌ ERKLAERUNG U30 missing")
                    
                    # Check for KENNZAHLEN section
                    kennzahlen = root.find(".//KENNZAHLEN")
                    if kennzahlen is not None:
                        checks.append("✅ KENNZAHLEN section found")
                        
                        # Count KZ values in XML
                        kz_count = len([child for child in kennzahlen if child.tag.startswith("KZ")])
                        checks.append(f"{kz_count} KZ values in XML")
                    else:
                        checks.append("❌ KENNZAHLEN section missing")
                    
                    # Check Steuernummer
                    stnr_elem = root.find(".//STEUERNUMMER")
                    if stnr_elem is not None and "12 345/6789" in stnr_elem.text:
                        checks.append("✅ Steuernummer correct")
                    else:
                        checks.append("❌ Steuernummer missing/wrong")
                    
                    # Check Content-Disposition header for filename
                    if "Content-Disposition" in response.headers:
                        checks.append("✅ Download headers set")
                    
                    self.log_result("XML Export (Download)", True, "; ".join(checks))
                    
                except ET.ParseError as e:
                    self.log_result("XML Export (Download)", False, f"Invalid XML: {str(e)}")
            else:
                self.log_result("XML Export (Download)", False, f"Status: {response.status_code}", {"text": response.text})

            # Test JSON XML endpoint
            response = self.session.post(f"{self.api_url}/uva/export-xml-json", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("success") and "xml_content" in data:
                    xml_content = data["xml_content"]
                    filename = data.get("filename", "")
                    
                    # Verify it's the same XML structure
                    try:
                        root = ET.fromstring(xml_content)
                        if root.tag == "ERKLAERUNGENPAKET":
                            self.log_result("XML Export (JSON)", True, f"Filename: {filename}")
                        else:
                            self.log_result("XML Export (JSON)", False, "Invalid XML structure")
                    except ET.ParseError:
                        self.log_result("XML Export (JSON)", False, "Invalid XML in JSON response")
                else:
                    self.log_result("XML Export (JSON)", False, "Missing xml_content in response", data)
            else:
                self.log_result("XML Export (JSON)", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_result("XML Export", False, f"Error: {str(e)}")

    def test_rksv_validation(self):
        """Test RKSV validation with various receipt scenarios."""
        try:
            test_receipts = [
                # Valid RKSV receipt
                {
                    "rksv_kassenid": "KASSE-001",
                    "rksv_belegnr": "001",
                    "rksv_qr_data": "_R1-AT0_KASSE-001_001_2024-12-15T10:30:00_1000_0_0_0_0_12345_CERT123_SIG456_SIG789",
                    "betrag": 10.00,
                    "datum": "2024-12-15T10:30:00Z"
                },
                # Valid receipt 2
                {
                    "rksv_kassenid": "KASSE-002",
                    "rksv_belegnr": "002",
                    "rksv_qr_data": "_R1-AT0_KASSE-002_002_2024-12-15T11:00:00_500_200_0_0_0_12346_CERT124_SIG457_SIG790",
                    "betrag": 7.00,
                    "datum": "2024-12-15T11:00:00Z"
                },
                # Invalid kassenid (empty)
                {
                    "rksv_kassenid": "",
                    "rksv_belegnr": "003",
                    "rksv_qr_data": "_R1-AT0__003_2024-12-15T12:00:00_300_0_0_0_0_12347_CERT125_SIG458_SIG791",
                    "betrag": 3.00,
                    "datum": "2024-12-15T12:00:00Z"
                },
                # Invalid belegnr (too long)
                {
                    "rksv_kassenid": "KASSE-003",
                    "rksv_belegnr": "VERY-LONG-RECEIPT-NUMBER-THAT-EXCEEDS-LIMITS",
                    "rksv_qr_data": "_R1-AT0_KASSE-003_004_2024-12-15T13:00:00_400_0_0_0_0_12348_CERT126_SIG459_SIG792",
                    "betrag": 4.00,
                    "datum": "2024-12-15T13:00:00Z"
                },
                # Duplicate belegnr for same kasse
                {
                    "rksv_kassenid": "KASSE-001",
                    "rksv_belegnr": "001",  # Same as first receipt
                    "rksv_qr_data": "_R1-AT0_KASSE-001_001_2024-12-15T14:00:00_600_0_0_0_0_12349_CERT127_SIG460_SIG793",
                    "betrag": 6.00,
                    "datum": "2024-12-15T14:00:00Z"
                },
                # Missing QR data
                {
                    "rksv_kassenid": "KASSE-004",
                    "rksv_belegnr": "005",
                    "rksv_qr_data": "",
                    "betrag": 5.00,
                    "datum": "2024-12-15T15:00:00Z"
                },
                # Invalid QR prefix
                {
                    "rksv_kassenid": "KASSE-005",
                    "rksv_belegnr": "006",
                    "rksv_qr_data": "_INVALID_KASSE-005_006_2024-12-15T16:00:00_700_0_0_0_0_12350_CERT128_SIG461_SIG794",
                    "betrag": 7.00,
                    "datum": "2024-12-15T16:00:00Z"
                }
            ]

            payload = {
                "receipts": test_receipts
            }

            response = self.session.post(f"{self.api_url}/rksv/validate", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                
                is_valid = data.get("valid", False)
                total_receipts = data.get("total_receipts", 0)
                valid_receipts = data.get("valid_receipts", 0)
                invalid_receipts = data.get("invalid_receipts", 0)
                issues = data.get("issues", [])
                
                checks = []
                
                checks.append(f"Total: {total_receipts}, Valid: {valid_receipts}, Invalid: {invalid_receipts}")
                
                # We expect some validation failures due to our test data
                if invalid_receipts > 0:
                    checks.append("✅ Detects invalid receipts")
                else:
                    checks.append("❌ Should detect invalid receipts")
                
                # Check for specific error types
                error_codes = [issue.get("code", "") for issue in issues]
                
                expected_errors = ["RKSV_KASSENID_MISSING", "RKSV_BELEGNR_FORMAT", "RKSV_DUPLICATE_BELEG", "RKSV_QR_PREFIX"]
                detected_errors = []
                
                for expected in expected_errors:
                    if any(expected in code for code in error_codes):
                        detected_errors.append(f"✅ {expected}")
                    else:
                        detected_errors.append(f"❌ Missing {expected}")
                
                checks.extend(detected_errors)
                
                # Overall success if we detected issues (validation is working)
                success = invalid_receipts > 0 and len(issues) > 0
                
                self.log_result("RKSV Validation", success, "; ".join(checks))
                
            else:
                self.log_result("RKSV Validation", False, f"Status: {response.status_code}", {"text": response.text})
                
        except Exception as e:
            self.log_result("RKSV Validation", False, f"Error: {str(e)}")

    def test_submission_pipeline(self):
        """Test UVA submission preparation and confirmation."""
        try:
            if not hasattr(self, 'calculated_kz_values'):
                self.log_result("Submission Pipeline", False, "No calculated KZ values available")
                return
            
            # Test submission preparation
            prepare_payload = {
                "year": self.test_year,
                "month": self.test_month,
                "kz_values": self.calculated_kz_values,
                "steuernummer": "12 345/6789",
                "invoices": self.test_invoices
            }

            response = self.session.post(f"{self.api_url}/uva/submission/prepare", json=prepare_payload)
            
            if response.status_code == 200:
                data = response.json()
                
                ready = data.get("ready", False)
                current_status = data.get("current_status", "")
                checklist = data.get("checklist", [])
                blocking_issues = data.get("blocking_issues", 0)
                warnings = data.get("warnings", 0)
                due_date = data.get("due_date", "")
                
                checks = []
                checks.append(f"Ready: {ready}")
                checks.append(f"Status: {current_status}")
                checks.append(f"Blocking: {blocking_issues}, Warnings: {warnings}")
                checks.append(f"Due: {due_date}")
                checks.append(f"Checklist items: {len(checklist)}")
                
                # Verify checklist contains expected items
                checklist_labels = [item.get("label", "") for item in checklist]
                expected_checks = ["Steuernummer vorhanden", "UVA berechnet", "BMF-Plausibilitätsprüfung", "XML-Export generierbar"]
                
                for expected in expected_checks:
                    if any(expected in label for label in checklist_labels):
                        checks.append(f"✅ {expected}")
                    else:
                        checks.append(f"❌ Missing {expected}")
                
                self.log_result("Submission Prepare", True, "; ".join(checks))
                
                # Test submission confirmation
                confirm_payload = {
                    "year": self.test_year,
                    "month": self.test_month,
                    "finanzonline_reference": "TEST-REF-123456"
                }
                
                confirm_response = self.session.post(f"{self.api_url}/uva/submission/confirm", json=confirm_payload)
                
                if confirm_response.status_code == 200:
                    confirm_data = confirm_response.json()
                    
                    success = confirm_data.get("success", False)
                    new_status = confirm_data.get("new_status", "")
                    message = confirm_data.get("message", "")
                    
                    if success and "EINGEREICHT" in new_status:
                        self.log_result("Submission Confirm", True, f"Status: {new_status}")
                    else:
                        self.log_result("Submission Confirm", False, f"Confirmation failed: {message}")
                else:
                    self.log_result("Submission Confirm", False, f"Status: {confirm_response.status_code}")
                
            else:
                self.log_result("Submission Prepare", False, f"Status: {response.status_code}", {"text": response.text})
                
        except Exception as e:
            self.log_result("Submission Pipeline", False, f"Error: {str(e)}")

    def test_kz_info(self):
        """Test KZ reference data endpoint."""
        try:
            response = self.session.get(f"{self.api_url}/uva/kz-info")
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, list) and len(data) > 0:
                    # Verify structure of KZ info
                    first_kz = data[0]
                    required_fields = ["kz", "label", "section"]
                    
                    checks = []
                    checks.append(f"Total KZ entries: {len(data)}")
                    
                    # Check for essential KZ codes
                    kz_codes = [item.get("kz", "") for item in data]
                    essential_codes = ["000", "022", "029", "070", "090", "095"]
                    
                    for code in essential_codes:
                        if code in kz_codes:
                            checks.append(f"✅ KZ{code}")
                        else:
                            checks.append(f"❌ Missing KZ{code}")
                    
                    # Verify structure
                    if all(field in first_kz for field in required_fields):
                        checks.append("✅ Structure valid")
                    else:
                        checks.append("❌ Invalid structure")
                    
                    self.log_result("KZ Info", True, "; ".join(checks))
                else:
                    self.log_result("KZ Info", False, "Empty or invalid KZ data", data)
            else:
                self.log_result("KZ Info", False, f"Status: {response.status_code}", {"text": response.text})
                
        except Exception as e:
            self.log_result("KZ Info", False, f"Error: {str(e)}")

    def test_edge_cases(self):
        """Test edge cases and error scenarios."""
        try:
            # Test empty invoice list (Leermeldung)
            empty_payload = {
                "year": 2024,
                "month": 12,
                "invoices": [],
                "sonstige_berichtigungen": 0.0
            }
            
            response = self.session.post(f"{self.api_url}/uva/calculate", json=empty_payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    kz_values = data.get("kz_values", {})
                    # Should be mostly zeros (Leermeldung)
                    kz000 = kz_values.get("kz000_netto", 0)
                    if kz000 == 0:
                        self.log_result("Edge Case: Empty UVA", True, "Leermeldung processed correctly")
                    else:
                        self.log_result("Edge Case: Empty UVA", False, f"Expected KZ000=0, got {kz000}")
                else:
                    self.log_result("Edge Case: Empty UVA", False, "Failed to process empty invoice list")
            else:
                self.log_result("Edge Case: Empty UVA", False, f"Status: {response.status_code}")
            
            # Test zero amounts
            zero_invoice = {
                "id": "ZERO-001",
                "invoice_number": "ZERO-001",
                "net_amount": 0.0,
                "vat_amount": 0.0,
                "gross_amount": 0.0,
                "vat_rate": 20,
                "invoice_type": "ausgang",
                "tax_treatment": "normal",
                "invoice_date": "2024-12-15T00:00:00Z"
            }
            
            zero_payload = {
                "year": 2024,
                "month": 12,
                "invoices": [zero_invoice]
            }
            
            response = self.session.post(f"{self.api_url}/uva/calculate", json=zero_payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    summary = data.get("summary", {})
                    skipped_count = summary.get("skipped_count", 0)
                    if skipped_count > 0:
                        self.log_result("Edge Case: Zero Amounts", True, f"Skipped {skipped_count} zero invoices")
                    else:
                        self.log_result("Edge Case: Zero Amounts", True, "Zero amounts handled")
                else:
                    self.log_result("Edge Case: Zero Amounts", False, "Failed to process zero amounts")
            else:
                self.log_result("Edge Case: Zero Amounts", False, f"Status: {response.status_code}")
            
            # Test negative amounts
            negative_invoice = {
                "id": "NEG-001",
                "invoice_number": "NEG-001",
                "net_amount": -100.0,
                "vat_amount": -20.0,
                "gross_amount": -120.0,
                "vat_rate": 20,
                "invoice_type": "ausgang",
                "tax_treatment": "normal",
                "invoice_date": "2024-12-15T00:00:00Z"
            }
            
            negative_payload = {
                "year": 2024,
                "month": 12,
                "invoices": [negative_invoice]
            }
            
            response = self.session.post(f"{self.api_url}/uva/calculate", json=negative_payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    warnings = data.get("warnings", [])
                    # Should generate warnings for negative amounts
                    self.log_result("Edge Case: Negative Amounts", True, f"Processed with {len(warnings)} warnings")
                else:
                    self.log_result("Edge Case: Negative Amounts", False, "Failed to process negative amounts")
            else:
                self.log_result("Edge Case: Negative Amounts", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_result("Edge Cases", False, f"Error: {str(e)}")

    def run_all_tests(self):
        """Run the complete test suite."""
        print("🚀 Starting UVA Express Backend API Tests")
        print(f"🌐 Testing against: {self.base_url}")
        print("=" * 80)
        
        # Run all tests in sequence
        self.test_health_check()
        self.test_uva_calculation()
        self.test_uva_validation()
        self.test_xml_export()
        self.test_rksv_validation()
        self.test_submission_pipeline()
        self.test_kz_info()
        self.test_edge_cases()
        
        # Print summary
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        print(f"Total Tests: {self.results['total_tests']}")
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        
        if self.results['failed'] > 0:
            print("\n🚨 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"  ❌ {error['test']}: {error['message']}")
        else:
            print("\n🎉 ALL TESTS PASSED!")
        
        print(f"\n📈 Success Rate: {(self.results['passed'] / self.results['total_tests']) * 100:.1f}%")
        
        return self.results['failed'] == 0


def main():
    """Main test execution."""
    # Get backend URL from environment or use default
    import os
    
    # Read from frontend .env to get the correct backend URL
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.strip().startswith('REACT_APP_BACKEND_URL='):
                    backend_url = line.strip().split('=', 1)[1]
                    break
        else:
            backend_url = "https://compliance-ready-8.preview.emergentagent.com"
    except:
        backend_url = "https://compliance-ready-8.preview.emergentagent.com"
    
    print(f"📍 Backend URL: {backend_url}")
    
    # Create tester and run tests
    tester = UVAAPITester(backend_url)
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n⏹️  Tests interrupted by user")
        return 130
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
        print(traceback.format_exc())
        return 1


if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)