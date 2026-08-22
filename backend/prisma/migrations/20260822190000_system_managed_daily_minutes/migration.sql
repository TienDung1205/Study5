UPDATE "LearningGoal"
SET "dailyMinutes" = CASE
  WHEN GREATEST(0, "targetScore" - COALESCE("currentScore", 0)) <= 100 THEN 30
  WHEN GREATEST(0, "targetScore" - COALESCE("currentScore", 0)) <= 250 THEN 45
  WHEN GREATEST(0, "targetScore" - COALESCE("currentScore", 0)) <= 450 THEN 60
  ELSE 90
END;
