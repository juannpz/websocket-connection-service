export interface Notification {
    user_id: number;
    table: TableName;
    action: Action;
}

interface UsersNotification extends Notification {
    table: TableName.USERS;
}

interface UserCredentialsNotification extends Notification {
    table: TableName.USER_CREDENTIALS;
}

interface UserStatusNotification extends Notification {
    table: TableName.USER_STATUS;
}

export type ExtendedNotification = UsersNotification | UserCredentialsNotification | UserStatusNotification;

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