export interface BaseNotification {
    user_id: number;
    table: TableName;
    action: Action;
}

interface UsersNotification extends BaseNotification {
    table: TableName.USERS;
}

interface UserCredentialsNotification extends BaseNotification {
    table: TableName.USER_CREDENTIALS;
}

interface UserStatusNotification extends BaseNotification {
    table: TableName.USER_STATUS;
}

export type Notification = UsersNotification | UserCredentialsNotification | UserStatusNotification;

export enum TableName {
    USERS = "users",
    USER_CREDENTIALS = "user_credentials",
    USER_STATUS = "user_status"
}

enum Action {
    CREATE = "CREATE",
    UPDATE = "UPDATE",
    DELETE = "DELETE"
}