#  awslocal dynamodb put-item \
> --table-name=LoanBrokerBanksTable \
    --item='{ "Type": { "S": "Home" }, "BankAddress": {"L": [ { "S": "BankRecipientPremium" }, { "S": "BankRecipientUniversal" }, { "S": "BankRecipientPawnshop" } ] } }'


# awslocal stepfunctions start-execution \
    --name=cli-test-run \
    --state-machine-arn=arn:aws:states:ap-northeast-1:000000000000:stateMachine:LoanBroker-RecipientList-Stack-LoanBroker641FC9A8-7bcbc758 \
    --input="{\"SSN\": \"123-45-6789\", \"Amount\": 500000, \"Term\": 30 }"

{
    "executionArn": "arn:aws:states:ap-northeast-1:000000000000:execution:LoanBroker-RecipientList-Stack-LoanBroker641FC9A8-7bcbc758:cli-test-run",
    "startDate": "2023-09-04T14:07:49.928000+08:00"
}


# awslocal stepfunctions describe-execution \
    --execution-arn=arn:aws:states:ap-northeast-1:000000000000:execution:LoanBroker-RecipientList-Stack-LoanBroker641FC9A8-7bcbc758:cli-test-run \
    --query="output" | jq -r  '. | fromjson'