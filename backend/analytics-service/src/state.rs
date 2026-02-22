use crate::db::Collections;

#[derive(Clone)]
pub struct AppState {
    pub collections: Collections,
}
