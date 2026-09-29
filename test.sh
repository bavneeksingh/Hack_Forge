TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"email":"bavneeksingh2004@gmail.com","password":"password123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Token: $TOKEN"

curl -s -X POST http://localhost:8080/api/leaves \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"leaveTypeId":1, "startDate":"2026-10-10", "endDate":"2026-10-12", "reason":"Test"}'

echo
curl -s -X GET "http://localhost:8080/api/leaves/team-calendar?from=2026-10-01&to=2026-10-31" \
  -H "Authorization: Bearer $TOKEN"
