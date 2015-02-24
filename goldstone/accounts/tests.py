"""Account unit tests."""
# Copyright 2015 Solinea, Inc.
#
# Licensed under the Solinea Software License Agreement (goldstone),
# Version 1.0 (the "License"); you may not use this file except in compliance
# with the License. You may obtain a copy of the License at:
#
#     http://www.solinea.com/goldstone/LICENSE.pdf
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either expressed or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
import json
from django.contrib.auth import get_user_model
from django.test import Client
from rest_framework.status import HTTP_200_OK, HTTP_401_UNAUTHORIZED, \
    HTTP_400_BAD_REQUEST, HTTP_201_CREATED
from goldstone.user.util_test import Setup, create_and_login, login, \
    AUTHORIZATION_PAYLOAD, CONTENT_BAD_TOKEN, CONTENT_MISSING_FIELDS, \
    CONTENT_MISSING_USERNAME, CONTENT_MISSING_PASSWORD, \
    CONTENT_UNIQUE_USERNAME, CONTENT_NON_FIELD_ERRORS, LOGIN_URL, \
    TEST_USER, CONTENT_NOT_BLANK

# URLs used by this module.
SETTINGS_URL = "/accounts/settings"
REGISTRATION_URL = "/accounts/register"
LOGOUT_URL = "/accounts/login"
PASSWORD_URL = "/accounts/password"


class Settings(Setup):
    """Retrieving and setting account settings."""

    def test_get(self):
        """Get user settings.

        At the moment, there are no settings to test against.

        """

        # Create a user and get the authorization token.
        token = create_and_login()

        client = Client()
        response = \
            client.get(SETTINGS_URL,
                       HTTP_AUTHORIZATION=AUTHORIZATION_PAYLOAD % token)

        self.assertContains(response, {}, status_code=HTTP_200_OK)

    def test_put(self):
        """Set user settings.

        At the moment, there are no settings to test against.

        """

        # Create a user and get the authorization token.
        token = create_and_login()

        client = Client()
        response = \
            client.put(SETTINGS_URL,
                       json.dumps({}),
                       content_type="application/json",
                       HTTP_AUTHORIZATION=AUTHORIZATION_PAYLOAD % token)

        self.assertContains(response, {}, status_code=HTTP_200_OK)

    def test_get_badtoken(self):
        """Doing a GET with a bad token."""

        # Create a user, and create a bad authorization token.
        bad_token = create_and_login().replace('9', '8').replace('4', '3')

        client = Client()
        response = \
            client.get(SETTINGS_URL,
                       HTTP_AUTHORIZATION=AUTHORIZATION_PAYLOAD % bad_token)

        self.assertContains(response,
                            CONTENT_BAD_TOKEN,
                            status_code=HTTP_401_UNAUTHORIZED)

    def test_put_badtoken(self):
        """Doing a PUT with a bad token."""

        # Create a user, and create a bad authorization token.  (This test will
        # erroneously fail if the good token doesn't contain any 9 characters,
        # which is very unlikely.)
        bad_token = create_and_login().replace('9', '8').replace('4', '2')

        client = Client()
        response = \
            client.put(SETTINGS_URL,
                       json.dumps({}),
                       content_type="application/json",
                       HTTP_AUTHORIZATION=AUTHORIZATION_PAYLOAD % bad_token)

        self.assertContains(response,
                            CONTENT_BAD_TOKEN,
                            status_code=HTTP_401_UNAUTHORIZED)


class Register(Setup):
    """Account registration tests."""

    def test_no_data(self):
        """Try registering with an empty payload."""

        client = Client()
        response = client.post(REGISTRATION_URL,
                               content_type="application/json")

        self.assertContains(response,
                            CONTENT_MISSING_FIELDS,
                            status_code=HTTP_400_BAD_REQUEST)

        self.assertEqual(get_user_model().objects.count(), 0)

    def test_no_username(self):
        """Try registering with no username."""

        client = Client()
        response = client.post(REGISTRATION_URL,
                               json.dumps({"password": "Diggler"}),
                               content_type="application/json")

        self.assertContains(response,
                            CONTENT_MISSING_USERNAME,
                            status_code=HTTP_400_BAD_REQUEST)

        self.assertEqual(get_user_model().objects.count(), 0)

    def test_no_password(self):
        """Try registering with no password."""

        client = Client()
        response = client.post(REGISTRATION_URL,
                               json.dumps({"username": "Dirk"}),
                               content_type="application/json")

        self.assertContains(response,
                            CONTENT_MISSING_PASSWORD,
                            status_code=HTTP_400_BAD_REQUEST)

        self.assertEqual(get_user_model().objects.count(), 0)

    def test_duplicate_name(self):
        """Try registering with a duplicate name."""

        USERS = ["Bahb", "Barbra"]

        # Register a couple of users.
        client = Client()

        for user in USERS:
            response = \
                client.post(REGISTRATION_URL,
                            json.dumps({"username": user, "password": "x"}),
                            content_type="application/json")

            self.assertEqual(response.status_code, HTTP_201_CREATED)

        self.assertEqual(get_user_model().objects.count(), 2)

        # Now try to re-register one of the accounts.
        response = \
            client.post(REGISTRATION_URL,
                        json.dumps({"username": USERS[0], "password": "x"}),
                        content_type="application/json")

        self.assertContains(response,
                            CONTENT_UNIQUE_USERNAME,
                            status_code=HTTP_400_BAD_REQUEST)

        self.assertEqual(get_user_model().objects.count(), 2)

    def test_post(self, email=None):
        """Register a user.

        :keyword email: An e-mail address to use when registering the user
        :type email: str or None

        """

        USERNAME = "Debra"

        # Assemble the registration payload
        payload = {"username": USERNAME, "password": "x"}
        if email:
            payload["email"] = email

        # Register this account.
        client = Client()
        response = \
            client.post(REGISTRATION_URL,
                        json.dumps(payload),
                        content_type="application/json")

        # Check the results.
        self.assertEqual(response.status_code, HTTP_201_CREATED)

        response_content = json.loads(response.content)
        self.assertEqual(response_content["username"], USERNAME)
        self.assertIsInstance(response_content["auth_token"], basestring)
        self.assertEquals(len(response_content), 3)
        self.assertEqual(response_content["email"], email if email else '')

        self.assertEqual(get_user_model().objects.count(), 1)
        self.assertEqual(get_user_model().objects.all()[0].username,
                         USERNAME)

    def test_post_with_email(self):
        """Register a user, with an email address."""

        self.test_post("dirk@diggler.com")


class Login(Setup):
    """Logging in."""

    def test_bad_username(self):
        """Logging in with a bad username."""

        # Create a user
        get_user_model().objects.create_user(*TEST_USER)

        # Try logging in with a bad username.
        client = Client()
        response = client.post(LOGIN_URL,
                               {"username": "Atticus",
                                "password": TEST_USER[2]})

        self.assertContains(response,
                            CONTENT_NON_FIELD_ERRORS,
                            status_code=HTTP_400_BAD_REQUEST)

    def test_bad_password(self):
        """Logging in with a bad password."""

        # Create a user
        get_user_model().objects.create_user(*TEST_USER)

        # Try logging in with a bad username.
        client = Client()
        response = client.post(LOGIN_URL,
                               {"username": TEST_USER[0], "password": "Finch"})

        self.assertContains(response,
                            CONTENT_NON_FIELD_ERRORS,
                            status_code=HTTP_400_BAD_REQUEST)

    def test_login(self):      # pylint: disable=R0201
        """Logging in."""

        create_and_login()

    def test_login_already_logged_in(self):        # pylint: disable=R0201
        """Logging in when the user is already logged in.

        The user should remain logged in.

        """

        create_and_login()
        login(TEST_USER[0], TEST_USER[2])

    def test_login_another_logged_in(self):        # pylint: disable=R0201
        """Logging in when another user is logged in.

        The second user should be logged in normally.

        """

        # Create user 1 and user 2. User 2 is just user 1 the the username and
        # password swapped.
        create_and_login()
        get_user_model().objects.create_user(TEST_USER[2],
                                             TEST_USER[1],
                                             TEST_USER[0])

        # Login user 1, then login user 2.
        login(TEST_USER[0], TEST_USER[2])
        login(TEST_USER[2], TEST_USER[0])


class Logout(Setup):
    """Logging out."""

    def test_not_logged_in_no_creds(self):
        """Logging out when a user is not logged in, and not giving any
        credentials."""

        client = Client()
        response = client.post(LOGOUT_URL)

        self.assertContains(response,
                            CONTENT_NOT_BLANK,
                            status_code=HTTP_400_BAD_REQUEST)

    def test_not_logged_in(self):
        """Logging out when a user is not logged in, with username and
        password."""

        create_and_login()

        # Logout. Then logout again with username and password.
        # pylint: disable=E1101
        client = Client()
        response = client.post(LOGOUT_URL,
                               json.dumps({"username": TEST_USER[0],
                                           "password": TEST_USER[2]}),
                               content_type="application/json")
        self.assertEqual(response.status_code, HTTP_200_OK)
        self.assertIsInstance(response.data["auth_token"], basestring)

        response = client.post(LOGOUT_URL,
                               json.dumps({"username": TEST_USER[0],
                                           "password": TEST_USER[2]}),
                               content_type="application/json")

        self.assertEqual(response.status_code, HTTP_200_OK)
        self.assertIsInstance(response.data["auth_token"], basestring)

    def test_logout(self):
        """Log out."""

        create_and_login()

        # pylint: disable=E1101
        client = Client()
        response = client.post(LOGOUT_URL,
                               json.dumps({"username": TEST_USER[0],
                                           "password": TEST_USER[2]}),
                               content_type="application/json")

        self.assertEqual(response.status_code, HTTP_200_OK)
        self.assertIsInstance(response.data["auth_token"], basestring)


class Password(Setup):
    """Test changing the user password."""

    def not_logged_in(self):
        """The user isn't logged in."""
        pass

    def test_missing_token(self):
        """The change password request doesn't have an authentication token."""

        # Create a user
        get_user_model().objects.create_user(*TEST_USER)

        # Try logging in with a bad username.
        client = Client()
        response = client.post(LOGIN_URL,
                               {"username": "Atticus",
                                "password": TEST_USER[2]})

        self.assertContains(response,
                            CONTENT_NON_FIELD_ERRORS,
                            status_code=HTTP_400_BAD_REQUEST)

    def test_bad_token(self):
        """The change password request has a bad authentication token."""

        # Create a user
        get_user_model().objects.create_user(*TEST_USER)

        # Try logging in with a bad username.
        client = Client()
        response = client.post(LOGIN_URL,
                               {"username": TEST_USER[0], "password": "Finch"})

        self.assertContains(response,
                            CONTENT_NON_FIELD_ERRORS,
                            status_code=HTTP_400_BAD_REQUEST)

    def test_no_current_password(self):
        """The change password request doesn't have a current password."""

        create_and_login()

    def test_bad_current_password(self):
        """The change password request has a bad curent password."""

        create_and_login()

    def test_no_new_password(self):
        """The change password request doesn't have a new password."""

        create_and_login()

    def test_change_password(self):
        """Change the current user's password."""

        create_and_login()
        login(TEST_USER[0], TEST_USER[2])
