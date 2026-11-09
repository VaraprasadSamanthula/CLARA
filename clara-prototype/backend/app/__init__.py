"""CLARA backend application package."""

from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.example'))
