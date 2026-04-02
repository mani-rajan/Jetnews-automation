@news
Feature: JetNews article interactions
  As a reader
  I want to open stories and use article actions
  So that I can verify the key user journeys in JetNews

  Background:
    Given I am on the JetNews home screen

  @android @ios
  Scenario: TC001 Open top story and verify headline matches article screen
    Given I store the top story headline from home screen
    When I open the top story
    Then the article headline should match the stored headline

  @android @story-navigation @ios
  Scenario Outline: TC002 Open next home stories and verify expected article headline
    Given I open story number <storyNumber> from home screen
    Then the stored headline should be "<headline>"
    And the article headline should match the stored headline

    Examples:
      | storyNumber | headline                                    |
      | 2           | A Little Thing about Android Module Paths   |
      | 3           | Dagger in Kotlin: Gotchas and Optimizations |

  @like @android @ios
  Scenario: TC003 Open top story and verify alert message once like button is tapped
    Given I open the top story
    When I tap the like button on article screen
    Then I verify Functionality not available alert message
    Then I close the alert message

  @android @shared @ios
  Scenario: TC004 Open top story and verify OS share dialog is shown when share is tapped
    Given I open the top story
    When I tap the share button on article screen
    Then the Android OS share dialog should be visible

  @android @known-issue @bookmark @ios
  Scenario: TC005 Open top story and verify bookmark navigation to home is currently broken
    Given I open the top story
    When I tap the bookmark button on article screen
    Then bookmark should navigate back to home feed

