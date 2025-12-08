from datetime import datetime, timezone

def check_daily_limit(last_action_time: datetime | None) -> bool:
    """
    Returns True if the user can act.
    Returns False if they already acted today.
    act includes: liking, commenting and posting
    """
    if last_action_time is None:
      return True # The user didn't act -> Approved

    now = datetime.now(timezone.utc)

    if now.date() > last_action_time.date():
      return True

    return False



