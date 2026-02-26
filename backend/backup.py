import os
import shutil
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

DEFAULT_BACKUP_DIR_NAME = "backups"
DEFAULT_MAX_BACKUPS = 20

def _get_backup_dir(file_path):
    custom_dir = os.environ.get("BACKUP_DIR")
    if custom_dir:
        return custom_dir
    vault_dir = os.path.dirname(os.path.abspath(file_path))
    return os.path.join(vault_dir, DEFAULT_BACKUP_DIR_NAME)

def _make_backup_filename(original_name):
    now = datetime.now(timezone.utc)
    timestamp = now.strftime("%Y-%m-%dT%H-%M-%S-%fZ")
    return f"{original_name}.{timestamp}.bak"

def create_backup(file_path):
    if not os.path.exists(file_path):
        return None
    try:
        backup_dir = _get_backup_dir(file_path)
        os.makedirs(backup_dir, mode=0o700, exist_ok=True)

        original_name = os.path.basename(file_path)
        backup_name = _make_backup_filename(original_name)
        backup_path = os.path.join(backup_dir, backup_name)

        shutil.copy2(file_path, backup_path)

        try:
            os.chmod(backup_path, 0o600)
        except OSError:
            pass

        logger.info("Backup created: %s", backup_path)
        return backup_path
    except Exception as e:
        logger.error("Failed to create backup of %s: %s", file_path, e)
        return None

def prune_backups(file_path, max_backups=None, retention_days=None):
    if max_backups is None:
        max_backups = int(os.environ.get("BACKUP_MAX_COUNT", str(DEFAULT_MAX_BACKUPS)))
    if retention_days is None:
        retention_days = int(os.environ.get("BACKUP_RETENTION_DAYS", "0"))
    try:
        backup_dir = _get_backup_dir(file_path)
        if not os.path.isdir(backup_dir):
            return

        original_name = os.path.basename(file_path)
        prefix = f"{original_name}."
        suffix = ".bak"

        backups = []
        for entry in os.listdir(backup_dir):
            if entry.startswith(prefix) and entry.endswith(suffix):
                full = os.path.join(backup_dir, entry)
                if os.path.isfile(full):
                    backups.append(full)

        backups.sort(key=lambda p: os.path.basename(p), reverse=True)

        to_delete = set()

        if retention_days > 0:
            cutoff = datetime.now(timezone.utc).timestamp() - (
                retention_days * 86400
            )
            for path in backups:
                if os.path.getmtime(path) < cutoff:
                    to_delete.add(path)

        if max_backups > 0 and len(backups) > max_backups:
            for path in backups[max_backups:]:
                to_delete.add(path)

        for path in to_delete:
            try:
                os.remove(path)
                logger.info("Pruned old backup: %s", path)
            except OSError as e:
                logger.warning("Could not delete old backup %s: %s", path, e)
    except Exception as e:
        logger.error("Failed to prune backups for %s: %s", file_path, e)

def list_backups(file_path):
    backup_dir = _get_backup_dir(file_path)
    if not os.path.isdir(backup_dir):
        return []

    original_name = os.path.basename(file_path)
    prefix = f"{original_name}."
    suffix = ".bak"

    results = []
    for entry in os.listdir(backup_dir):
        if entry.startswith(prefix) and entry.endswith(suffix):
            full = os.path.join(backup_dir, entry)
            if os.path.isfile(full):
                ts_part = entry[len(prefix):-len(suffix)]
                try:
                    dt = datetime.strptime(ts_part, "%Y-%m-%dT%H-%M-%S-%fZ")
                    dt = dt.replace(tzinfo=timezone.utc)
                    iso_ts = dt.isoformat()
                except ValueError:
                    iso_ts = ts_part

                results.append({
                    "filename": entry,
                    "timestamp": iso_ts,
                    "size": os.path.getsize(full),
                })

    results.sort(key=lambda r: r["timestamp"], reverse=True)
    return results

def resolve_backup_path(backup_filename, file_path):
    backup_dir = _get_backup_dir(file_path)
    backup_path = os.path.join(backup_dir, backup_filename)

    real_backup = os.path.realpath(backup_path)
    real_dir = os.path.realpath(backup_dir)
    if not real_backup.startswith(real_dir + os.sep):
        raise ValueError("Invalid backup filename")

    if not os.path.isfile(backup_path):
        raise FileNotFoundError(f"Backup not found: {backup_filename}")

    return backup_path

def restore_backup(backup_filename, file_path):
    backup_path = resolve_backup_path(backup_filename, file_path)

    create_backup(file_path)

    tmp_path = file_path + ".restore.tmp"
    try:
        shutil.copy2(backup_path, tmp_path)
        os.replace(tmp_path, file_path)
        logger.info("Restored vault from backup: %s", backup_filename)
        return True
    except OSError:
        try:
            os.remove(tmp_path)
        except OSError:
            pass
        raise