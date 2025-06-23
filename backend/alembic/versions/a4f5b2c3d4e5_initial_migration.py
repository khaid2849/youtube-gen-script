"""Add user profile fields

Revision ID: a4f5b2c3d4e5
Revises: 3885ed1d18f1
Create Date: 2025-06-20 10:30:00.123456

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a4f5b2c3d4e5'
down_revision = 'ef9990282f1e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to users table
    op.add_column('users', sa.Column('bio', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('company', sa.String(), nullable=True))
    op.add_column('users', sa.Column('location', sa.String(), nullable=True))
    op.add_column('users', sa.Column('website', sa.String(), nullable=True))


def downgrade() -> None:
    # Remove columns
    op.drop_column('users', 'website')
    op.drop_column('users', 'location')
    op.drop_column('users', 'company')
    op.drop_column('users', 'bio')