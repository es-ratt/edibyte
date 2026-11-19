"""/data/status: honest counts for every data set the app shows."""


def test_data_status_reports_foods_references_and_weekly_tips(client):
    body = client.get("/data/status").json()
    assert body["foods_total"] >= 48 and body["foods_verified"] == 0
    refs = body["references"]
    assert refs["sourced"] >= 6 and refs["pending"] >= 1
    assert all(r["url"].startswith("https://") and r["date"] for r in refs["rows"])
    weekly = body["weekly_tips"]
    assert weekly["total"] >= 7 and weekly["reviewed"] == 0
    # Food rows without a verified source must say so per method.
    assert body["food_methods"] == {"estimate": body["foods_total"]}
