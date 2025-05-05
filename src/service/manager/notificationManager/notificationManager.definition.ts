export interface INotification {
    table: TableName;
    action: Action;
}

interface IUsersNotification extends INotification {
    table: TableName.USERS;
}

interface IUserCredentialsNotification extends INotification {
    table: TableName.USER_CREDENTIALS;
}

interface IUserStatusNotification extends INotification {
    table: TableName.USER_STATUS;
}

export type Notification = IUsersNotification | IUserCredentialsNotification | IUserStatusNotification;

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