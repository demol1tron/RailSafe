"""remove railway lines, trains and incident media

Revision ID: 0002_remove_lines_trains_media
Revises: 0001_initial
"""

from alembic import op
from sqlalchemy import inspect

revision = "0002_remove_lines_trains_media"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())

    if "incident_media" in tables:
        op.drop_table("incident_media")

    if "incidents" in tables:
        columns = {column["name"] for column in inspect(bind).get_columns("incidents")}
        if "line_id" in columns:
            with op.batch_alter_table("incidents") as batch:
                batch.drop_column("line_id")
        columns = {column["name"] for column in inspect(bind).get_columns("incidents")}
        if "train_id" in columns:
            with op.batch_alter_table("incidents") as batch:
                batch.drop_column("train_id")

    tables = set(inspect(bind).get_table_names())
    if "railway_lines" in tables:
        op.drop_table("railway_lines")
    if "trains" in tables:
        op.drop_table("trains")


def downgrade():
    # Removed subsystems are intentionally not recreated automatically.
    # Restore from a database backup if rollback to the old application is required.
    pass
