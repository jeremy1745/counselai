import logging

logger = logging.getLogger("caise.security")


def log_login_success(email: str, ip: str) -> None:
    logger.info("LOGIN_SUCCESS email=%s ip=%s", email, ip)


def log_login_failure(email: str, ip: str, reason: str = "invalid_credentials") -> None:
    logger.warning("LOGIN_FAILURE email=%s ip=%s reason=%s", email, ip, reason)


def log_account_locked(email: str, ip: str) -> None:
    logger.warning("ACCOUNT_LOCKED email=%s ip=%s", email, ip)


def log_admin_action(admin_email: str, action: str, target_user_id: str) -> None:
    logger.info("ADMIN_ACTION admin=%s action=%s target=%s", admin_email, action, target_user_id)


def log_document_operation(user_email: str, operation: str, case_id: str, doc_id: str = "") -> None:
    logger.info("DOCUMENT_OP user=%s op=%s case=%s doc=%s", user_email, operation, case_id, doc_id)
