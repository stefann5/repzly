pub mod exercise;
pub mod program;
pub mod workout_exercise;

pub use exercise::{
    CreateExerciseRequest, Exercise, ExerciseQueryParams, ExerciseResponse, MuscleIntensity,
    PaginatedExerciseResponse, UpdateExerciseRequest,
};
pub use program::{
    CreateProgramRequest, CreateProgramResponse, PaginatedProgramResponse, Program,
    ProgramResponse, ProgramSearchParams, UpdateProgramRequest,
};
pub use workout_exercise::{
    DeleteExercisesRequest, DeleteWorkoutsRequest, IdMapping, NextWorkoutResponse, Set,
    UpsertExercisesRequest, UpsertExercisesResponse, WeekResponse, WorkoutExercise,
    WorkoutExerciseResponse, WorkoutGroup,
};
