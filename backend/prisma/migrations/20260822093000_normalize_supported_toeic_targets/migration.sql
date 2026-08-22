UPDATE "LearningGoal"
SET "targetScore" = CASE
  WHEN "targetScore" <= 450 THEN 450
  WHEN "targetScore" <= 600 THEN 600
  WHEN "targetScore" <= 700 THEN 700
  ELSE 800
END;

UPDATE "LearningGoal"
SET
  "endingPhasePosition" = CASE "targetScore"
    WHEN 450 THEN 2
    WHEN 600 THEN 4
    WHEN 700 THEN 5
    ELSE 6
  END,
  "targetTrack" = CASE "targetScore"
    WHEN 450 THEN 'FOUNDATION_450'
    WHEN 600 THEN 'CORE_600'
    WHEN 700 THEN 'ADVANCED_700'
    ELSE 'MASTERY_800'
  END,
  "startingPhasePosition" = LEAST(
    "startingPhasePosition",
    CASE "targetScore"
      WHEN 450 THEN 2
      WHEN 600 THEN 4
      WHEN 700 THEN 5
      ELSE 6
    END
  );
