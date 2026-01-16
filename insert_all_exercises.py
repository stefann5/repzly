import re
from pymongo import MongoClient

MONGODB_URI = "mongodb+srv://stefannik04_db_user:a9hK1u1tWRqUpBfa@repzly.faivxth.mongodb.net/?appName=repzly"
DATABASE_NAME = "workout_db"
COLLECTION_NAME = "exercises"

def parse_muscles(muscle_file_path):
    """Parse muscle.sql and return a dict mapping muscle_id -> muscle_name"""
    muscles = {}
    pattern = r"INSERT INTO muscle \(id, name\) VALUES \((\d+), '([^']+)'\)"

    with open(muscle_file_path, 'r', encoding='utf-8') as f:
        for line in f:
            match = re.search(pattern, line)
            if match:
                muscle_id = int(match.group(1))
                muscle_name = match.group(2)
                muscles[muscle_id] = muscle_name

    return muscles

def parse_exercises(data_file_path, muscles):
    """Parse data.sql and return a dict of exercises keyed by title (to handle duplicates)"""
    exercises = {}

    # Pattern for Exercise INSERT
    exercise_pattern = r"INSERT INTO Exercise \(id, title, description, link, equipment_id, training_type_id\) VALUES \((\d+), '([^']+)', '[^']*', '([^']+)', \d+, \d+\)"

    # Pattern for exercise_muscle INSERT
    muscle_pattern = r"INSERT INTO exercise_muscle \(exercise_id, muscle_id, intensity\) VALUES \((\d+), (\d+), (\d+)\)"

    # First pass: collect all exercises by their SQL id
    exercise_by_id = {}

    with open(data_file_path, 'r', encoding='utf-8') as f:
        for line in f:
            # Check for Exercise INSERT
            match = re.search(exercise_pattern, line)
            if match:
                exercise_id = int(match.group(1))
                title = match.group(2)
                link = match.group(3)
                exercise_by_id[exercise_id] = {
                    'title': title,
                    'link': link,
                    'muscles': []
                }
                continue

            # Check for exercise_muscle INSERT
            match = re.search(muscle_pattern, line)
            if match:
                exercise_id = int(match.group(1))
                muscle_id = int(match.group(2))
                intensity = int(match.group(3))

                if exercise_id in exercise_by_id and muscle_id in muscles:
                    exercise_by_id[exercise_id]['muscles'].append({
                        'muscle': muscles[muscle_id],
                        'intensity': intensity
                    })

    # Second pass: convert to final format, using title as key (handles duplicates)
    for ex_id, ex_data in exercise_by_id.items():
        title = ex_data['title']
        # If duplicate title exists, this will overwrite (keeps last occurrence)
        exercises[title] = {
            '_id': title,
            'name': title,
            'demonstration_link': ex_data['link'],
            'muscles': ex_data['muscles']
        }

    return exercises

def insert_to_mongodb(exercises):
    """Insert exercises into MongoDB"""
    client = MongoClient(MONGODB_URI)
    db = client[DATABASE_NAME]
    collection = db[COLLECTION_NAME]

    # Convert dict to list
    exercise_list = list(exercises.values())

    inserted_count = 0
    skipped_count = 0

    for exercise in exercise_list:
        try:
            collection.insert_one(exercise)
            inserted_count += 1
            print(f"Inserted: {exercise['name']}")
        except Exception as e:
            if "duplicate key" in str(e).lower():
                skipped_count += 1
                print(f"Skipped (duplicate): {exercise['name']}")
            else:
                print(f"Error inserting {exercise['name']}: {e}")

    client.close()

    print(f"\n--- Summary ---")
    print(f"Total exercises processed: {len(exercise_list)}")
    print(f"Inserted: {inserted_count}")
    print(f"Skipped (duplicates): {skipped_count}")

def main():
    print("Parsing muscle.sql...")
    muscles = parse_muscles('muscle.sql')
    print(f"Found {len(muscles)} muscles")

    print("\nParsing data.sql...")
    exercises = parse_exercises('data.sql', muscles)
    print(f"Found {len(exercises)} unique exercises")

    print("\nInserting into MongoDB...")
    insert_to_mongodb(exercises)

    print("\nDone!")

if __name__ == "__main__":
    main()
