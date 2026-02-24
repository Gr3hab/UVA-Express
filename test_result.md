#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Go-live: 100% automatische UVA-Engine, RKSV-Validierung, steuerlich belastbare Einreichungspipeline, produktionsreife Fehlerbehandlung/Audit-Trail. FastAPI als zentrale UVA-Engine, Supabase Postgres als Hauptdatenbank."

backend:
  - task: "UVA Calculation Engine"
    implemented: true
    working: true
    file: "backend/uva_engine.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Implemented complete UVA calculation engine with all KZ codes from U30 2026 form. Handles: normal 20%/10%/13%/19%/7%, exports, IG Lieferung, IG Erwerb, all Reverse Charge variants, Einfuhr, Grundstück, Kleinunternehmer. POST /api/uva/calculate"
        - working: true
          agent: "testing"
          comment: "✅ PASSED - Comprehensive testing with realistic Austrian tax data: Normal 20%/10%/13% rates, IG Erwerb, Reverse Charge (§19 Abs1, Bauleistungen), Exports, IG Lieferung, Grundstück, Kleinunternehmer. All KZ codes correctly calculated: KZ000 (Ausgang only), KZ070 (IG Erwerb sum), RC symmetry verified (KZ057=KZ066, KZ048=KZ082). Edge cases tested: empty invoices (Leermeldung), zero amounts, negative amounts. Summary counts accurate."

  - task: "UVA BMF Validation"
    implemented: true
    working: true
    file: "backend/uva_validator.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "BMF plausibility checks: rate consistency, KZ095 recalculation, RC symmetry, IG symmetry, negative amounts, empty UVA, duplicate invoices, period checks. POST /api/uva/validate"
        - working: true
          agent: "testing"
          comment: "✅ PASSED - Validation engine correctly validates calculated KZ values. KZ095 consistency check working. Successfully detects intentional errors (wrong KZ095 values). All BMF plausibility rules functioning correctly."

  - task: "BMF XML Export"
    implemented: true
    working: true
    file: "backend/uva_xml.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "BMF-compliant ERKLAERUNGENPAKET XML with all KZ codes, proper XML escaping, zero-value filtering. POST /api/uva/export-xml and /api/uva/export-xml-json"
        - working: true
          agent: "testing"
          comment: "✅ PASSED - XML export generates BMF-compliant structure: ERKLAERUNGENPAKET root, ERKLAERUNG art='U30', KENNZAHLEN section with 21 KZ values. Both download (/api/uva/export-xml) and JSON (/api/uva/export-xml-json) endpoints working. Minor: Steuernummer formatting could be improved but XML structure is valid."

  - task: "RKSV Validation"
    implemented: true
    working: true
    file: "backend/rksv_validator.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "RKSV V1: Kassen-ID format, Belegnummer format, QR-data structure validation, duplicate check, plausibility checks. POST /api/rksv/validate"
        - working: true
          agent: "testing"
          comment: "✅ PASSED - RKSV validation detects format errors, duplicates, and QR-data issues. Tested with 7 receipts (4 valid, 3 invalid). Correctly identifies: invalid Kassen-ID, oversized Belegnummer, duplicate receipts, missing/invalid QR-data. Error detection working as expected."

  - task: "Submission Pipeline"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Submission preparation with checklist (Steuernummer, BMF validation, KZ095 consistency, XML generation, period check). Status workflow: Entwurf→Berechnet→Validiert→Freigegeben→Eingereicht→Bestätigt. POST /api/uva/submission/prepare and /api/uva/submission/confirm"
        - working: true
          agent: "testing"
          comment: "✅ PASSED - Submission pipeline complete: /prepare endpoint validates all prerequisites (Steuernummer, BMF validation, XML generation) with 7 checklist items. Status workflow functioning (Ready: True, Status: validiert). /confirm endpoint successfully processes submission with FinanzOnline reference. Due date calculation correct (2025-02-15 for 12/2024)."

  - task: "KZ Reference Data"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Complete KZ reference data with labels, sections, paragraphs, rates. GET /api/uva/kz-info"
        - working: true
          agent: "testing"
          comment: "✅ PASSED - KZ reference data endpoint returns 44 complete KZ entries with proper structure (kz, label, section fields). All essential codes present: KZ000, KZ022, KZ029, KZ070, KZ090, KZ095. Data structure validated and complete."

metadata:
  created_by: "main_agent"
  version: "2.0"
  test_sequence: 2
  run_ui: false

test_plan:
  current_focus:
    - "UVA Calculation Engine"
    - "UVA BMF Validation"
    - "BMF XML Export"
    - "RKSV Validation"
    - "Submission Pipeline"
  stuck_tasks: []
  test_all: true
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: "Implemented complete Go-live V1 backend: UVA engine, BMF validation, XML export, RKSV validation, submission pipeline. All endpoints are under /api/. Backend runs on port 8001. Test all endpoints with realistic Austrian invoice data including edge cases (RC, IG Erwerb, exports, multiple VAT rates, RKSV receipts). Test the full flow: calculate → validate → prepare submission → export XML."
    - agent: "testing"
      message: "✅ COMPREHENSIVE BACKEND TESTING COMPLETED - All 6 backend tasks tested and PASSING. Created backend_test.py with 13 test cases covering: UVA calculation with realistic Austrian tax scenarios (all rates, treatments), BMF validation with error detection, XML export (both endpoints), RKSV validation with edge cases, complete submission pipeline, KZ reference data, and edge cases (empty UVA, zero/negative amounts). 100% success rate. Backend is production-ready for Go-live V1."